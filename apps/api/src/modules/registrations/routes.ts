import { myRegistrations, myRegistrationsQuery, registration } from '@gatherly/shared';
import { and, asc, count, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { events, registrations } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { requireUser } from '../../lib/guards';
import { businessMetrics } from '../../lib/metrics';
import {
  ACTIVE_STATUSES,
  releaseSeat,
  seatTransaction,
  takeSeat,
  toEventSummary,
  toRegistration,
} from './seats';

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
      const row = await seatTransaction(app.db, async (tx) => {
        const { registration, started } = await releaseSeat(tx, mine);
        // Throwing rolls the cancellation back.
        if (started) throw new AppError('EVENT_STARTED', 409);
        return registration;
      });
      businessMetrics.cancellation();
      return toRegistration(row);
    },
  );

  app.get(
    '/me/registrations',
    { schema: { querystring: myRegistrationsQuery, response: { 200: myRegistrations } } },
    async (request) => {
      const user = requireUser(request);
      const { when, page, pageSize } = request.query;
      const now = new Date();
      const mine = and(
        eq(registrations.userId, user.id),
        inArray(registrations.status, ACTIVE_STATUSES),
      );
      const upcoming = gt(events.startsAt, now);
      const [rows, [counts]] = await Promise.all([
        app.db
          .select({ registration: registrations, event: events })
          .from(registrations)
          .innerJoin(events, eq(events.id, registrations.eventId))
          .where(and(mine, when === 'upcoming' ? upcoming : lte(events.startsAt, now)))
          .orderBy(
            when === 'upcoming' ? asc(events.startsAt) : desc(events.startsAt),
            asc(registrations.id),
          )
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        app.db
          .select({
            upcoming: sql<number>`count(*) filter (where ${upcoming})`.mapWith(Number),
            all: count(),
          })
          .from(registrations)
          .innerJoin(events, eq(events.id, registrations.eventId))
          .where(mine),
      ]);
      const items = rows.map((r) => ({
        ...toRegistration(r.registration),
        event: toEventSummary(r.event),
      }));
      const tabs = { upcoming: counts!.upcoming, past: counts!.all - counts!.upcoming };
      return { items, page, pageSize, total: tabs[when], counts: tabs };
    },
  );
};

export default registrationsRoutes;
