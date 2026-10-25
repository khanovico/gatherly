import {
  createEventInput,
  eventDetail,
  eventListQuery,
  eventSummary,
  paginated,
  updateEventInput,
  type CreateEventInput,
  type EventDetail,
} from '@gatherly/shared';
import { and, asc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { events, registrations, users } from '../../db/schema';
import type { AuthUser } from '../../lib/auth';
import { AppError } from '../../lib/errors';
import { assertOwnerOrAdmin, requireEntitlement, requireUser } from '../../lib/guards';

type EventRow = typeof events.$inferSelect;

const params = z.object({ id: z.uuid() });

// Response schemas strip extra columns; only instants need converting.
const withIsoDates = (row: EventRow) => ({
  ...row,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
});

/** Validated input → columns: free events only, and no venue or URL left over from the other format. */
const toColumns = ({ coverImage, ...input }: CreateEventInput) => {
  if (input.priceCents > 0) {
    throw new AppError('PAID_TICKETS_UNAVAILABLE', 422, 'Paid tickets are coming soon');
  }
  return {
    ...input,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    coverImage: coverImage ?? `/images/covers/${input.category}-1.webp`,
    ...(input.format === 'online'
      ? { venueName: null, address: null, city: null }
      : { onlineUrl: null }),
  };
};

const eventsRoutes: FastifyPluginAsyncZod = async (app) => {
  const findEvent = async (id: string) => {
    const [row] = await app.db.select().from(events).where(eq(events.id, id));
    if (!row) throw new AppError('NOT_FOUND', 404, 'Event not found');
    return row;
  };

  /** Loads the stored event for a write by its organizer or an admin. */
  const findOwnedEvent = async (request: FastifyRequest, id: string) => {
    const event = await findEvent(id);
    assertOwnerOrAdmin(requireUser(request), event.organizerId);
    return event;
  };

  const loadDetail = async (event: EventRow, viewer: AuthUser | null): Promise<EventDetail> => {
    const [[organizer], [reg]] = await Promise.all([
      app.db
        .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, event.organizerId)),
      viewer
        ? app.db
            .select()
            .from(registrations)
            .where(
              and(
                eq(registrations.eventId, event.id),
                eq(registrations.userId, viewer.id),
                inArray(registrations.status, ['pending_payment', 'confirmed']),
              ),
            )
        : [],
    ]);
    return {
      ...withIsoDates(event),
      organizer: organizer!,
      viewerRegistration: reg
        ? {
            ...reg,
            createdAt: reg.createdAt.toISOString(),
            cancelledAt: reg.cancelledAt?.toISOString() ?? null,
          }
        : null,
    };
  };

  app.get(
    '/events',
    { schema: { querystring: eventListQuery, response: { 200: paginated(eventSummary) } } },
    async (request) => {
      const { q, category, from, to, page, pageSize } = request.query;
      const pattern = q && `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      const where = and(
        eq(events.status, 'published'),
        gte(events.startsAt, from ? new Date(from) : new Date()),
        to ? lte(events.startsAt, new Date(to)) : undefined,
        category ? eq(events.category, category) : undefined,
        pattern ? or(ilike(events.title, pattern), ilike(events.summary, pattern)) : undefined,
      );
      const [rows, total] = await Promise.all([
        app.db
          .select()
          .from(events)
          .where(where)
          .orderBy(asc(events.startsAt), asc(events.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        app.db.$count(events, where),
      ]);
      return { items: rows.map(withIsoDates), page, pageSize, total };
    },
  );

  app.get('/events/:id', { schema: { params, response: { 200: eventDetail } } }, async (request) =>
    loadDetail(await findEvent(request.params.id), request.user),
  );

  app.post(
    '/events',
    {
      // Plan check before body validation: a free member gets the paywall, not field errors.
      preValidation: async (request) => void requireEntitlement(request, 'events:create'),
      schema: { body: createEventInput, response: { 201: eventDetail } },
    },
    async (request, reply) => {
      const user = requireEntitlement(request, 'events:create');
      const [event] = await app.db
        .insert(events)
        .values({ ...toColumns(request.body), organizerId: user.id })
        .returning();
      return reply.status(201).send(await loadDetail(event!, user));
    },
  );

  app.patch(
    '/events/:id',
    {
      preValidation: async (request) => void requireUser(request),
      schema: { params, body: updateEventInput, response: { 200: eventDetail } },
    },
    async (request) => {
      const stored = await findOwnedEvent(request, request.params.id);
      if (stored.status === 'cancelled') {
        throw new AppError('EVENT_CANCELLED', 409, 'Cancelled events cannot be edited');
      }
      if (stored.startsAt <= new Date()) {
        throw new AppError('EVENT_STARTED', 409, 'Events cannot be edited once they start');
      }
      // Re-check the whole event, so a patch cannot break rules that span fields.
      const current = Object.fromEntries(
        Object.entries(withIsoDates(stored)).filter(([, value]) => value !== null),
      );
      const columns = toColumns(createEventInput.parse({ ...current, ...request.body }));
      // Conditional update: a registration landing after the read cannot push capacity below the count.
      const [event] = await app.db
        .update(events)
        .set(columns)
        .where(and(eq(events.id, stored.id), lte(events.registeredCount, columns.capacity)))
        .returning();
      if (!event) {
        throw new AppError(
          'CAPACITY_BELOW_REGISTERED',
          409,
          'Capacity cannot be lower than the number of registered attendees',
        );
      }
      return loadDetail(event, request.user);
    },
  );

  app.post(
    '/events/:id/cancel',
    { schema: { params, response: { 200: eventDetail } } },
    async (request) => {
      const stored = await findOwnedEvent(request, request.params.id);
      const [event] = await app.db
        .update(events)
        .set({ status: 'cancelled' })
        .where(eq(events.id, stored.id))
        .returning();
      return loadDetail(event!, request.user);
    },
  );
};

export default eventsRoutes;
