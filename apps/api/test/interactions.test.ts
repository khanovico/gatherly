import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { interactions } from '../src/db/schema';
import { createEvent, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

it('logs a signed-out batch under the anonymous id and skips unknown events', async () => {
  const host = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, host.userId, 10);
  const anonymousId = randomUUID();
  const post = (payload: object) =>
    ctx.app.inject({ method: 'POST', url: '/api/v1/interactions', payload });
  const seen = { type: 'impression', surface: 'discover_grid' };

  const res = await post({
    anonymousId,
    interactions: [
      { ...seen, eventId: event.id, position: 0, rankerVersion: 'rules-1' },
      { ...seen, eventId: randomUUID(), position: 1 },
    ],
  });
  expect(res.statusCode).toBe(204);
  const rows = await ctx.db
    .select()
    .from(interactions)
    .where(eq(interactions.anonymousId, anonymousId));
  expect(rows).toMatchObject([{ eventId: event.id, userId: null, position: 0 }]);

  const noActor = await post({ interactions: [{ ...seen, eventId: event.id }] });
  expect(noActor.statusCode).toBe(400);
});
