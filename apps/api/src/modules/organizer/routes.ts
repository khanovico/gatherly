import { attendee, eventSummary, registration } from '@gatherly/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { events, registrations, users } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { assertOwnerOrAdmin, requireUser } from '../../lib/guards';
import {
  ACTIVE_STATUSES,
  releaseSeat,
  toEventSummary,
  toRegistration,
} from '../registrations/seats';

const params = z.object({ id: z.uuid() });

const organizerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me/events',
    { schema: { response: { 200: z.array(eventSummary) } } },
    async (request) => {
      const user = requireUser(request);
      const rows = await app.db
        .select()
        .from(events)
        .where(eq(events.organizerId, user.id))
        .orderBy(asc(events.startsAt));
      return rows.map(toEventSummary);
    },
  );

  app.get(
    '/events/:id/registrations',
    { schema: { params, response: { 200: z.array(attendee) } } },
    async (request) => {
      const user = requireUser(request);
      const [event] = await app.db
        .select({ organizerId: events.organizerId })
        .from(events)
        .where(eq(events.id, request.params.id));
      if (!event) throw new AppError('NOT_FOUND', 404, 'Event not found');
      assertOwnerOrAdmin(user, event.organizerId);
      const rows = await app.db
        .select({
          registrationId: registrations.id,
          user: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
          email: users.email,
          status: registrations.status,
          registeredAt: registrations.createdAt,
        })
        .from(registrations)
        .innerJoin(users, eq(users.id, registrations.userId))
        .where(
          and(
            eq(registrations.eventId, request.params.id),
            inArray(registrations.status, ACTIVE_STATUSES),
          ),
        )
        .orderBy(asc(registrations.createdAt));
      return rows.map((r) => ({ ...r, registeredAt: r.registeredAt.toISOString() }));
    },
  );

  // Organizers may remove attendees at any time, including after the start.
  app.post(
    '/registrations/:id/cancel',
    { schema: { params, response: { 200: registration } } },
    async (request) => {
      const user = requireUser(request);
      const [found] = await app.db
        .select({ organizerId: events.organizerId })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(eq(registrations.id, request.params.id));
      if (!found) throw new AppError('NOT_FOUND', 404, 'Registration not found');
      assertOwnerOrAdmin(user, found.organizerId);
      const { registration: row } = await app.db.transaction((tx) =>
        releaseSeat(tx, eq(registrations.id, request.params.id)),
      );
      return toRegistration(row);
    },
  );
};

export default organizerRoutes;
