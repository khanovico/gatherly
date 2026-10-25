import {
  EventFormat,
  NEIGHBORHOODS,
  TIME_SLOTS,
  profile,
  publicProfile,
  updateProfileInput,
  type Profile,
  type RadiusKm,
} from '@gatherly/shared';
import { and, asc, eq, gt, inArray, sql, type SQL } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eventSaves, events, registrations, userProfiles, users } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { requireUser } from '../../lib/guards';
import { ACTIVE_STATUSES, toEventSummary } from '../registrations/seats';

const params = z.object({ id: z.uuid() });
/** Upcoming events shown per list on a public profile. */
const LIST_LIMIT = 12;

/** `GET|PUT /me/profile`, `GET /users/:id`. */
const profileRoutes: FastifyPluginAsyncZod = async (app) => {
  const loadProfile = async (userId: string): Promise<Profile> => {
    const [row] = await app.db
      .select({ bio: users.bio, stored: userProfiles })
      .from(users)
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId));
    const { bio, stored } = row!;
    if (!stored) {
      return {
        bio,
        interests: [],
        tags: [],
        neighborhood: null,
        homeLat: null,
        homeLng: null,
        radiusKm: 10,
        formats: [...EventFormat.options],
        timeSlots: [...TIME_SLOTS],
        onboardedAt: null,
      };
    }
    return {
      ...stored,
      bio,
      radiusKm: stored.radiusKm as RadiusKm,
      onboardedAt: stored.onboardedAt?.toISOString() ?? null,
    };
  };

  /** Upcoming published events matching `where`, soonest first, with the viewer's `saved` flag. */
  const upcoming = async (where: SQL, viewerId: string | undefined) => {
    const rows = await app.db
      .select()
      .from(events)
      .where(and(where, eq(events.status, 'published'), gt(events.startsAt, sql`now()`)))
      .orderBy(asc(events.startsAt), asc(events.id))
      .limit(LIST_LIMIT);
    if (!viewerId) return rows.map(toEventSummary);
    const saves = rows.length
      ? await app.db
          .select({ eventId: eventSaves.eventId })
          .from(eventSaves)
          .where(
            and(
              eq(eventSaves.userId, viewerId),
              inArray(
                eventSaves.eventId,
                rows.map((e) => e.id),
              ),
            ),
          )
      : [];
    const saved = new Set(saves.map((s) => s.eventId));
    return rows.map((e) => ({ ...toEventSummary(e), saved: saved.has(e.id) }));
  };

  app.get('/me/profile', { schema: { response: { 200: profile } } }, async (request) =>
    loadProfile(requireUser(request).id),
  );

  app.put(
    '/me/profile',
    { schema: { body: updateProfileInput, response: { 200: profile } } },
    async (request) => {
      const user = requireUser(request);
      const { bio, onboarded, ...prefs } = request.body;
      const columns: Partial<typeof userProfiles.$inferInsert> = { ...prefs };
      // Picking a neighborhood moves home to its centre; browser coordinates win when sent.
      if (prefs.neighborhood !== undefined && prefs.homeLat === undefined) {
        const area = NEIGHBORHOODS.find((n) => n.id === prefs.neighborhood);
        Object.assign(columns, { homeLat: area?.lat ?? null, homeLng: area?.lng ?? null });
      }
      if (onboarded) columns.onboardedAt = new Date();
      await app.db.transaction(async (tx) => {
        if (bio !== undefined) await tx.update(users).set({ bio }).where(eq(users.id, user.id));
        if (Object.keys(columns).length === 0) return;
        await tx
          .insert(userProfiles)
          .values({ userId: user.id, ...columns })
          .onConflictDoUpdate({
            target: userProfiles.userId,
            set: {
              ...columns,
              // Finishing the wizard again keeps the first onboarding time.
              ...(onboarded && { onboardedAt: sql`coalesce(${userProfiles.onboardedAt}, now())` }),
            },
          });
      });
      return loadProfile(user.id);
    },
  );

  app.get(
    '/users/:id',
    { schema: { params, response: { 200: publicProfile } } },
    async (request) => {
      const { id } = request.params;
      const [user] = await app.db
        .select({
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          status: users.status,
          createdAt: users.createdAt,
          interests: userProfiles.interests,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(eq(users.id, id));
      if (!user || user.status === 'suspended') {
        throw new AppError('NOT_FOUND', 404, 'User not found');
      }
      const attendingIds = app.db
        .select({ id: registrations.eventId })
        .from(registrations)
        .where(and(eq(registrations.userId, id), inArray(registrations.status, ACTIVE_STATUSES)));
      // Where someone will be is theirs to see; hosting is public.
      const isOwner = request.user?.id === id;
      const [hosting, attending] = await Promise.all([
        upcoming(eq(events.organizerId, id), request.user?.id),
        isOwner ? upcoming(inArray(events.id, attendingIds), id) : undefined,
      ]);
      return {
        ...user,
        interests: user.interests ?? [],
        memberSince: user.createdAt.toISOString(),
        hosting,
        attending,
      };
    },
  );
};

export default profileRoutes;
