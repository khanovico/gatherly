import { afterAll, beforeAll, expect, it } from 'vitest';
import { createEvent, login, seatCounts, signedInMember, startApp } from './setup';

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

it('follows the brief: register, full, cancel frees the seat, re-register', async () => {
  const organizer = await login(ctx.app, 'organizer');
  const attendee = await login(ctx.app, 'attendee');
  const other = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, organizer.userId, 1);

  expect((await register(event.id, attendee.cookie)).statusCode).toBe(201);
  const full = await register(event.id, other.cookie);
  expect([full.statusCode, full.json().code]).toEqual([409, 'EVENT_FULL']);

  const cancel = await ctx.app.inject({
    method: 'DELETE',
    url: `/api/v1/events/${event.id}/registrations/me`,
    headers: { cookie: attendee.cookie },
  });
  expect(cancel.json().status).toBe('cancelled');
  expect(await seatCounts(ctx.db, event.id)).toEqual({ registeredCount: 0, confirmed: 0 });

  expect((await register(event.id, attendee.cookie)).statusCode).toBe(201);
  expect(await seatCounts(ctx.db, event.id)).toEqual({ registeredCount: 1, confirmed: 1 });

  const mine = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/me/registrations',
    headers: { cookie: attendee.cookie },
  });
  expect(mine.json().items.map((r: { eventId: string }) => r.eventId)).toContain(event.id);
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

it('survives one member registering and cancelling at the same time', async () => {
  const organizer = await signedInMember(ctx.db);
  const member = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, organizer.userId, 10);
  const cancel = () =>
    ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/events/${event.id}/registrations/me`,
      headers: { cookie: member.cookie },
    });

  const responses = await Promise.all(
    Array.from({ length: 30 }, (_, i) => (i % 2 ? cancel() : register(event.id, member.cookie))),
  );

  expect(responses.map((r) => r.statusCode).filter((s) => s >= 500)).toEqual([]);
  const { registeredCount, confirmed } = await seatCounts(ctx.db, event.id);
  expect(registeredCount).toBe(confirmed);
});

it('cancelling an event cancels its registrations, once, and only before it starts', async () => {
  const organizer = await login(ctx.app, 'organizer');
  const member = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, organizer.userId, 10);
  const started = await createEvent(ctx.db, organizer.userId, 10, { startsAt: new Date() });
  const cancel = (id: string) =>
    ctx.app.inject({
      method: 'POST',
      url: `/api/v1/events/${id}/cancel`,
      headers: { cookie: organizer.cookie },
    });
  await register(event.id, member.cookie);

  expect((await cancel(event.id)).json()).toMatchObject({
    status: 'cancelled',
    registeredCount: 0,
  });
  expect(await seatCounts(ctx.db, event.id)).toEqual({ registeredCount: 0, confirmed: 0 });
  const again = await cancel(event.id);
  expect([again.statusCode, again.json().code]).toEqual([409, 'EVENT_CANCELLED']);
  const late = await cancel(started.id);
  expect([late.statusCode, late.json().code]).toEqual([409, 'EVENT_STARTED']);
});
