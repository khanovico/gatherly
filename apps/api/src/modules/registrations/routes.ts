import { myRegistrations, registration, type MyRegistration } from '@gatherly/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { events, registrations } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { requireUser } from '../../lib/guards';
import { businessMetrics } from '../../lib/metrics';
import { ACTIVE_STATUSES, releaseSeat, takeSeat, toEventSummary, toRegistration } from './seats';

const eventParams = z.object({ id: z.uuid() });

const registrationsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/events/:id/registrations',
    { schema: { params: eventParams, response: { 201: registration } } },
    async (request, reply) => {
      const user = requireUser(request);
      const row = await takeSeat(app.db, request.params.id, user.id).catch((err: unknown) => {
        businessMetrics.registration(err instanceof AppError ? err.code : 'INTERNAL');
        throw err;
      });
      businessMetrics.registration('confirmed');
      return reply.status(201).send(toRegistration(row));
    },
  );

  app.delete(
    '/events/:id/registrations/me',
    { schema: { params: eventParams, response: { 200: registration } } },
    async (request) => {
      const user = requireUser(request);
      const mine = and(
        eq(registrations.eventId, request.params.id),
        eq(registrations.userId, user.id),
      )!;
      const row = await app.db.transaction(async (tx) => {
        const { registration, startsAt } = await releaseSeat(tx, mine);
        // Throwing rolls the cancellation back.
        if (startsAt <= new Date()) throw new AppError('EVENT_STARTED', 409);
        return registration;
      });
      businessMetrics.cancellation();
      return toRegistration(row);
    },
  );

  app.get(
    '/me/registrations',
    { schema: { response: { 200: myRegistrations } } },
    async (request) => {
      const user = requireUser(request);
      const rows = await app.db
        .select({ registration: registrations, event: events })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(
          and(eq(registrations.userId, user.id), inArray(registrations.status, ACTIVE_STATUSES)),
        )
        .orderBy(asc(events.startsAt));
      const items: MyRegistration[] = rows.map((r) => ({
        ...toRegistration(r.registration),
        event: toEventSummary(r.event),
      }));
      const now = Date.now();
      const started = (r: MyRegistration) => Date.parse(r.event.startsAt) <= now;
      return { upcoming: items.filter((r) => !started(r)), past: items.filter(started).reverse() };
    },
  );
};

export default registrationsRoutes;
