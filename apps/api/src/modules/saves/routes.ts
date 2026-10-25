import { eventListQuery, eventSummary, paginated } from '@gatherly/shared';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eventHides, eventSaves, events } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { requireUser } from '../../lib/guards';
import { businessMetrics } from '../../lib/metrics';
import { toEventSummary } from '../registrations/seats';

const params = z.object({ id: z.uuid() });
const savedQuery = eventListQuery.pick({ page: true, pageSize: true });

const isMissingEvent = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return (e.cause?.code ?? e.code) === '23503';
};

/** `GET /me/saved`, `PUT|DELETE /events/:id/save`, `PUT /events/:id/hide`. */
const savesRoutes: FastifyPluginAsyncZod = async (app) => {
  /** Idempotent insert; true only when the mark is new, so repeats don't inflate the counters. */
  const mark = async (table: typeof eventSaves, userId: string, eventId: string) => {
    const rows = await app.db
      .insert(table)
      .values({ userId, eventId })
      .onConflictDoNothing()
      .returning()
      .catch((err: unknown) => {
        if (isMissingEvent(err)) throw new AppError('NOT_FOUND', 404, 'Event not found');
        throw err;
      });
    return rows.length > 0;
  };

  app.get(
    '/me/saved',
    { schema: { querystring: savedQuery, response: { 200: paginated(eventSummary) } } },
    async (request) => {
      const user = requireUser(request);
      const { page, pageSize } = request.query;
      const mine = eq(eventSaves.userId, user.id);
      const [rows, total] = await Promise.all([
        app.db
          .select({ event: events })
          .from(eventSaves)
          .innerJoin(events, eq(events.id, eventSaves.eventId))
          .where(mine)
          .orderBy(desc(eventSaves.createdAt), asc(events.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        app.db.$count(eventSaves, mine),
      ]);
      const items = rows.map((r) => ({ ...toEventSummary(r.event), saved: true }));
      return { items, page, pageSize, total };
    },
  );

  app.put('/events/:id/save', { schema: { params } }, async (request, reply) => {
    const user = requireUser(request);
    if (await mark(eventSaves, user.id, request.params.id)) businessMetrics.save();
    return reply.status(204).send();
  });

  app.delete('/events/:id/save', { schema: { params } }, async (request, reply) => {
    const user = requireUser(request);
    await app.db
      .delete(eventSaves)
      .where(and(eq(eventSaves.userId, user.id), eq(eventSaves.eventId, request.params.id)));
    return reply.status(204).send();
  });

  app.put('/events/:id/hide', { schema: { params } }, async (request, reply) => {
    const user = requireUser(request);
    if (await mark(eventHides, user.id, request.params.id)) businessMetrics.hide();
    return reply.status(204).send();
  });
};

export default savesRoutes;
