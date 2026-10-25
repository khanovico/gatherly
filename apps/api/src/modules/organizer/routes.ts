import {
  attendee,
  myEvents,
  myEventsQuery,
  pageQuery,
  paginated,
  registration,
} from '@gatherly/shared';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  like,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { events, registrations, users } from '../../db/schema';
import { config } from '../../config';
import { DEMO_EMAIL_DOMAIN, visibleEmail } from '../../lib/demo';
import { AppError } from '../../lib/errors';
import { assertCanManage, assertOwnerOrAdmin, requireUser } from '../../lib/guards';
import { businessMetrics } from '../../lib/metrics';
import {
  ACTIVE_STATUSES,
  releaseSeat,
  seatTransaction,
  toEventSummary,
  toRegistration,
} from '../registrations/seats';

const params = z.object({ id: z.uuid() });
const attendeesQuery = pageQuery.extend({ q: z.string().trim().max(100).optional() });
const likePattern = (q?: string) => q && `%${q.replace(/[\\%_]/g, '\\$&')}%`;

const organizerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me/events',
    { schema: { querystring: myEventsQuery, response: { 200: myEvents } } },
    async (request) => {
      const user = requireUser(request);
      const { when, page, pageSize } = request.query;
      const now = new Date();
      const published = eq(events.status, 'published');
      const tabs: Record<typeof when, SQL> = {
        upcoming: and(published, gt(events.startsAt, now))!,
        past: and(published, lte(events.startsAt, now))!,
        cancelled: eq(events.status, 'cancelled'),
      };
      const n = (where: SQL) => sql<number>`count(*) filter (where ${where})`.mapWith(Number);
      const mine = eq(events.organizerId, user.id);
      const [rows, [stats]] = await Promise.all([
        app.db
          .select()
          .from(events)
          .where(and(mine, tabs[when]))
          .orderBy(when === 'past' ? desc(events.startsAt) : asc(events.startsAt), asc(events.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        app.db
          .select({
            upcoming: n(tabs.upcoming),
            past: n(tabs.past),
            cancelled: n(tabs.cancelled),
            registrations:
              sql<number>`coalesce(sum(${events.registeredCount}) filter (where ${published}), 0)`.mapWith(
                Number,
              ),
            fillRate: sql<
              number | null
            >`avg(${events.registeredCount}::float / ${events.capacity}) filter (where ${tabs.upcoming})`,
          })
          .from(events)
          .where(mine),
      ]);
      return {
        items: rows.map(toEventSummary),
        page,
        pageSize,
        total: stats![when],
        stats: stats!,
      };
    },
  );

  app.get(
    '/events/:id/registrations',
    {
      schema: { params, querystring: attendeesQuery, response: { 200: paginated(attendee) } },
    },
    async (request) => {
      const user = requireUser(request);
      const { q, page, pageSize } = request.query;
      const [event] = await app.db
        .select({ organizerId: events.organizerId })
        .from(events)
        .where(eq(events.id, request.params.id));
      if (!event) throw new AppError('NOT_FOUND', 404, 'Event not found');
      assertOwnerOrAdmin(user, event.organizerId);
      const pattern = likePattern(q);
      // Masked emails must not be searchable, or a search would confirm an address.
      const demoOnly = config.DEMO_MODE ? like(users.email, `%${DEMO_EMAIL_DOMAIN}`) : undefined;
      const where = and(
        eq(registrations.eventId, request.params.id),
        inArray(registrations.status, ACTIVE_STATUSES),
        pattern
          ? or(ilike(users.name, pattern), and(ilike(users.email, pattern), demoOnly))
          : undefined,
      );
      const [rows, [counted]] = await Promise.all([
        app.db
          .select({
            registrationId: registrations.id,
            user: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
            email: users.email,
            status: registrations.status,
            registeredAt: registrations.createdAt,
          })
          .from(registrations)
          .innerJoin(users, eq(users.id, registrations.userId))
          .where(where)
          .orderBy(asc(registrations.createdAt), asc(registrations.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        app.db
          .select({ total: count() })
          .from(registrations)
          .innerJoin(users, eq(users.id, registrations.userId))
          .where(where),
      ]);
      const items = rows.map((r) => ({
        ...r,
        email: visibleEmail(r.email),
        registeredAt: r.registeredAt.toISOString(),
      }));
      return { items, page, pageSize, total: counted!.total };
    },
  );

  // Organizers may remove attendees at any time, including after the start.
  app.post(
    '/registrations/:id/cancel',
    { schema: { params, response: { 200: registration } } },
    async (request) => {
      const user = requireUser(request);
      const [found] = await app.db
        .select({ id: users.id, email: users.email })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .innerJoin(users, eq(users.id, events.organizerId))
        .where(eq(registrations.id, request.params.id));
      if (!found) throw new AppError('NOT_FOUND', 404, 'Registration not found');
      assertCanManage(user, found);
      const { registration: row } = await seatTransaction(app.db, (tx) =>
        releaseSeat(tx, eq(registrations.id, request.params.id)),
      );
      businessMetrics.cancellation();
      return toRegistration(row);
    },
  );
};

export default organizerRoutes;
