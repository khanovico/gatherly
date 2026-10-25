import {
  EventStatus,
  adminStats,
  adminUser,
  adminUserPatch,
  eventListQuery,
  eventSummary,
  paginated,
  type AdminUserPatch,
} from '@gatherly/shared';
import { and, asc, desc, eq, gt, ilike, inArray, like, or } from 'drizzle-orm';
import * as Sentry from '@sentry/node';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { config } from '../../config';
import { events, plans, registrations, subscriptions, users } from '../../db/schema';
import { resetDemo } from '../../db/seed';
import { DEMO_EMAIL_DOMAIN, isReadOnlyAccount, visibleEmail } from '../../lib/demo';
import { AppError } from '../../lib/errors';
import { requireAdmin } from '../../lib/guards';
import { currentTraceId } from '../../lib/request-telemetry';
import { seatDrift } from '../registrations/seats';

const params = z.object({ id: z.uuid() });
const userListQuery = eventListQuery.pick({ q: true, page: true, pageSize: true });
const eventAdminQuery = userListQuery.extend({ status: EventStatus.optional() });

const seatDriftRow = z.object({
  eventId: z.uuid(),
  registeredCount: z.int(),
  activeRegistrations: z.int(),
});

const likePattern = (q?: string) => q && `%${q.replace(/[\\%_]/g, '\\$&')}%`;

const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  // Scoped to this plugin: every admin route needs an active admin.
  app.addHook('onRequest', async (request) => void requireAdmin(request));

  const premiumPlanId = app.db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.code, 'premium'));

  const selectUsers = () =>
    app.db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        email: users.email,
        role: users.role,
        status: users.status,
        plan: plans.code,
        protected: users.isProtected,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(
        subscriptions,
        and(eq(subscriptions.userId, users.id), eq(subscriptions.status, 'active')),
      )
      .leftJoin(plans, eq(plans.id, subscriptions.planId));

  // No active subscription means the free plan. On the public demo, real accounts are read-only.
  const toAdminUser = ({
    plan,
    createdAt,
    email,
    ...row
  }: Awaited<ReturnType<typeof selectUsers>>[0]) => ({
    ...row,
    email: visibleEmail(email),
    protected: row.protected || isReadOnlyAccount(email),
    plan: plan ?? 'free',
    createdAt: createdAt.toISOString(),
  });

  app.get('/admin/stats', { schema: { response: { 200: adminStats } } }, async () => {
    const [
      totalUsers,
      suspendedUsers,
      premiumUsers,
      totalEvents,
      upcomingEvents,
      cancelledEvents,
      confirmedRegistrations,
    ] = await Promise.all([
      app.db.$count(users),
      app.db.$count(users, eq(users.status, 'suspended')),
      app.db.$count(
        subscriptions,
        and(eq(subscriptions.status, 'active'), inArray(subscriptions.planId, premiumPlanId)),
      ),
      app.db.$count(events),
      app.db.$count(events, and(eq(events.status, 'published'), gt(events.startsAt, new Date()))),
      app.db.$count(events, eq(events.status, 'cancelled')),
      app.db.$count(registrations, eq(registrations.status, 'confirmed')),
    ]);
    return {
      totalUsers,
      suspendedUsers,
      premiumUsers,
      totalEvents,
      upcomingEvents,
      cancelledEvents,
      confirmedRegistrations,
    };
  });

  app.get(
    '/admin/users',
    { schema: { querystring: userListQuery, response: { 200: paginated(adminUser) } } },
    async (request) => {
      const { q, page, pageSize } = request.query;
      const pattern = likePattern(q);
      // Masked emails must not be searchable either, or a search would confirm an address exists.
      const demoOnly = config.DEMO_MODE ? like(users.email, `%${DEMO_EMAIL_DOMAIN}`) : undefined;
      const where = pattern
        ? or(ilike(users.name, pattern), and(ilike(users.email, pattern), demoOnly))
        : undefined;
      const [rows, total] = await Promise.all([
        selectUsers()
          .where(where)
          .orderBy(desc(users.isProtected), asc(users.name))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        app.db.$count(users, where),
      ]);
      return { items: rows.map(toAdminUser), page, pageSize, total };
    },
  );

  app.patch(
    '/admin/users/:id',
    { schema: { params, body: adminUserPatch, response: { 200: adminUser } } },
    async (request) => {
      const { id } = request.params;
      const patch = request.body;
      const [target] = await selectUsers().where(eq(users.id, id));
      if (!target) throw new AppError('NOT_FOUND', 404, 'User not found');
      const user = toAdminUser(target);
      const changed = (Object.keys(patch) as (keyof AdminUserPatch)[]).filter(
        (key) => patch[key] !== user[key],
      );
      if (changed.length === 0) return user;
      if (isReadOnlyAccount(target.email)) {
        throw new AppError('FORBIDDEN', 403, 'The public demo cannot change real accounts');
      }
      if (user.protected) {
        throw new AppError(
          'PROTECTED_DEMO_ACCOUNT',
          409,
          'Demo personas cannot be suspended, demoted or change plan',
        );
      }

      await app.db.transaction(async (tx) => {
        const losesAdmin =
          user.role === 'admin' &&
          user.status === 'active' &&
          (patch.role === 'member' || patch.status === 'suspended');
        if (losesAdmin) {
          // Locking every active admin serializes concurrent demotions.
          const admins = await tx
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.role, 'admin'), eq(users.status, 'active')))
            .orderBy(users.id)
            .for('update');
          if (admins.every((a) => a.id === id)) {
            throw new AppError('FORBIDDEN', 403, 'At least one active admin must remain');
          }
        }

        const { plan, ...fields } = patch;
        if (fields.role || fields.status)
          await tx.update(users).set(fields).where(eq(users.id, id));
        if (plan === 'free') await tx.delete(subscriptions).where(eq(subscriptions.userId, id));
        if (plan === 'premium' && user.plan !== 'premium') {
          const [premium] = await premiumPlanId;
          // `comp`: granted by an admin, no payment behind it.
          const comp = {
            planId: premium!.id,
            provider: 'comp' as const,
            status: 'active' as const,
            currentPeriodEnd: null,
            providerRef: null,
          };
          await tx
            .insert(subscriptions)
            .values({ userId: id, ...comp })
            .onConflictDoUpdate({ target: subscriptions.userId, set: comp });
        }
      });

      const [updated] = await selectUsers().where(eq(users.id, id));
      return toAdminUser(updated!);
    },
  );

  app.get(
    '/admin/events',
    { schema: { querystring: eventAdminQuery, response: { 200: paginated(eventSummary) } } },
    async (request) => {
      const { q, status, page, pageSize } = request.query;
      const pattern = likePattern(q);
      const where = and(
        status ? eq(events.status, status) : undefined,
        pattern ? or(ilike(events.title, pattern), ilike(events.summary, pattern)) : undefined,
      );
      const [rows, total] = await Promise.all([
        app.db
          .select()
          .from(events)
          .where(where)
          .orderBy(desc(events.startsAt), asc(events.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        app.db.$count(events, where),
      ]);
      const items = rows.map((row) => ({
        ...row,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
      }));
      return { items, page, pageSize, total };
    },
  );

  // Events whose seat counter disagrees with their registration rows. Expected empty: the
  // database trigger keeps them equal. A non-empty answer is a bug report, not a state to fix by hand.
  app.get(
    '/admin/integrity/seats',
    { schema: { response: { 200: z.object({ drift: z.array(seatDriftRow) }) } } },
    async () => ({ drift: await seatDrift(app.db) }),
  );

  if (config.DEMO_MODE) {
    app.post('/admin/demo/reset', async (_request, reply) => {
      await resetDemo(app.db);
      return reply.status(204).send();
    });
  }

  // Lets reviewers see a real error travel to Sentry and Grafana. One per 10 s for the whole app.
  let lastDiagnosticAt = 0;
  app.post('/admin/diagnostics/error', async (request, reply) => {
    if (Date.now() - lastDiagnosticAt < 10_000)
      throw new AppError('RATE_LIMITED', 429, 'One test error every 10 seconds');
    lastDiagnosticAt = Date.now();
    // A unique message, or Sentry's dedupe drops every repeat after the first; grouping uses the stack.
    const error = new Error(
      `Diagnostic test error from the admin console at ${new Date().toISOString()}`,
    );
    error.name = 'DiagnosticTestError';
    const sentryEventId = Sentry.captureException(error, {
      fingerprint: ['diagnostic-test-error', 'api'],
    });
    request.log.error({ err: error }, 'diagnostic test error');
    return reply
      .status(500)
      .type('application/problem+json')
      .send({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        code: 'INTERNAL',
        detail: 'Diagnostic test error (expected)',
        traceId: currentTraceId() ?? null,
        sentryEventId,
      });
  });
};

export default adminRoutes;
