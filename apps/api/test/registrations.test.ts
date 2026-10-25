import type { Persona } from '@gatherly/shared';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createEvent, seatCounts, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

const login = async (persona: Persona) => {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/demo-login',
    payload: { persona },
  });
  return { userId: res.json().user.id as string, cookie: res.headers['set-cookie'] as string };
};

const register = (eventId: string, cookie: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/events/${eventId}/registrations`,
    headers: { cookie },
  });

it('follows the brief: register, full, cancel frees the seat, re-register', async () => {
  const organizer = await login('organizer');
  const attendee = await login('attendee');
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
  expect(mine.json().upcoming.map((r: { eventId: string }) => r.eventId)).toContain(event.id);
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
