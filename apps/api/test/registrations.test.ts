import { afterAll, beforeAll, expect, it } from 'vitest';
import { createEvent, seatCounts, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

const register = (eventId: string, cookie: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/events/${eventId}/registrations`,
    headers: { cookie },
  });

it('never overbooks: 25 parallel registrations for 10 seats', async () => {
  const organizer = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, organizer.userId, 10);
  const members = await Promise.all(Array.from({ length: 25 }, () => signedInMember(ctx.db)));

  const responses = await Promise.all(members.map((m) => register(event.id, m.cookie)));

  expect(responses.filter((r) => r.statusCode === 201)).toHaveLength(10);
  expect(responses.filter((r) => r.json().code === 'EVENT_FULL')).toHaveLength(15);
  expect(await seatCounts(ctx.db, event.id)).toEqual({ registeredCount: 10, confirmed: 10 });
});
