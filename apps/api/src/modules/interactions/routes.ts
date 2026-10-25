import { interactionBatch } from '@gatherly/shared';
import { inArray } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { events, interactions } from '../../db/schema';
import { AppError } from '../../lib/errors';

/** `POST /interactions`. */
const interactionsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/interactions', { schema: { body: interactionBatch } }, async (request, reply) => {
    const { anonymousId, interactions: batch } = request.body;
    const userId = request.user?.id;
    if (!userId && !anonymousId) {
      throw new AppError('VALIDATION_FAILED', 400, 'Send anonymousId when signed out');
    }
    // An event deleted since the page loaded would fail the foreign key and lose the whole batch.
    const ids = [...new Set(batch.map((i) => i.eventId))];
    const known = await app.db
      .select({ id: events.id })
      .from(events)
      .where(inArray(events.id, ids));
    const exists = new Set(known.map((e) => e.id));
    const rows = batch
      .filter((i) => exists.has(i.eventId))
      .map((i) => ({ ...i, userId, anonymousId }));
    if (rows.length) await app.db.insert(interactions).values(rows);
    return reply.status(204).send();
  });
};

export default interactionsRoutes;
