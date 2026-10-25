import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { events, users } from '../src/db/schema';
import { seatDrift } from '../src/modules/registrations/seats';
import { createEvent, eventInput, login, seatCounts, signedInMember, startApp } from './setup';

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
const cancelMine = (eventId: string, cookie: string) =>
  ctx.app.inject({
    method: 'DELETE',
    url: `/api/v1/events/${eventId}/registrations/me`,
    headers: { cookie },
  });

it('follows the brief: create, register, full, cancel frees the seat, re-register', async () => {
  const organizer = await login(ctx.app, 'organizer');
  const attendee = await login(ctx.app, 'attendee');
  const other = await signedInMember(ctx.db);
  const created = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/events',
    headers: { cookie: organizer.cookie },
    payload: eventInput(1),
  });
  expect(created.statusCode).toBe(201);
  const event = created.json<{ id: string }>();

  expect((await register(event.id, attendee.cookie)).statusCode).toBe(201);
  const full = await register(event.id, other.cookie);
  expect([full.statusCode, full.json().code]).toEqual([409, 'EVENT_FULL']);

  expect((await cancelMine(event.id, attendee.cookie)).json().status).toBe('cancelled');
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

  const responses = await Promise.all(
    Array.from({ length: 30 }, (_, i) => (i % 2 ? cancelMine : register)(event.id, member.cookie)),
  );

  expect(responses.map((r) => r.statusCode).filter((s) => s >= 500)).toEqual([]);
  const { registeredCount, confirmed } = await seatCounts(ctx.db, event.id);
  expect(registeredCount).toBe(confirmed);
});

it('keeps the counter equal to the rows under mixed register and cancel load', async () => {
  const organizer = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, organizer.userId, 8);
  const members = await Promise.all(Array.from({ length: 20 }, () => signedInMember(ctx.db)));

  // Every member registers, cancels and registers again, all at once, for 8 seats.
  const responses = await Promise.all(
    members.flatMap((m) => [register, cancelMine, register].map((act) => act(event.id, m.cookie))),
  );

  expect(responses.map((r) => r.statusCode).filter((s) => s >= 500)).toEqual([]);
  const { registeredCount, confirmed } = await seatCounts(ctx.db, event.id);
  expect(registeredCount).toBe(confirmed);
  expect(registeredCount).toBeLessThanOrEqual(8);
});

it('releases a seat when its member is deleted, not only through the API', async () => {
  const organizer = await signedInMember(ctx.db);
  const member = await signedInMember(ctx.db);
  const other = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, organizer.userId, 1);
  expect((await register(event.id, member.cookie)).statusCode).toBe(201);

  // Cascades to the registration row; the trigger, not application code, frees the seat.
  await ctx.db.delete(users).where(eq(users.id, member.userId));

  expect(await seatCounts(ctx.db, event.id)).toEqual({ registeredCount: 0, confirmed: 0 });
  expect((await register(event.id, other.cookie)).statusCode).toBe(201);
});

it('answers EVENT_BUSY instead of queueing behind a held event row', async () => {
  const organizer = await signedInMember(ctx.db);
  const member = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, organizer.userId, 10);

  // Another transaction holds the event row for longer than SEAT_LOCK_TIMEOUT_MS.
  let locked!: () => void;
  let release!: () => void;
  const lockTaken = new Promise<void>((resolve) => (locked = resolve));
  const held = new Promise<void>((resolve) => (release = resolve));
  const holder = ctx.db.transaction(async (tx) => {
    await tx.select({ id: events.id }).from(events).where(eq(events.id, event.id)).for('update');
    locked();
    await held;
  });
  await lockTaken;

  const res = await register(event.id, member.cookie);
  release();
  await holder;

  expect([res.statusCode, res.json().code]).toEqual([503, 'EVENT_BUSY']);
  expect(await seatCounts(ctx.db, event.id)).toEqual({ registeredCount: 0, confirmed: 0 });
  expect((await register(event.id, member.cookie)).statusCode).toBe(201);
});

it('reports no seat drift, to the test and to an admin', async () => {
  expect(await seatDrift(ctx.db)).toEqual([]);
  const admin = await login(ctx.app, 'admin');
  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/admin/integrity/seats',
    headers: { cookie: admin.cookie },
  });
  expect([res.statusCode, res.json()]).toEqual([200, { drift: [] }]);
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

type Member = Awaited<ReturnType<typeof signedInMember>>;
type Response = Awaited<ReturnType<typeof register>>;

it.each<[string, (member: Member, host: Member) => Promise<Response>, number, string]>([
  [
    'registering after the start',
    async (m, host) =>
      register((await createEvent(ctx.db, host.userId, 10, { startsAt: new Date() })).id, m.cookie),
    409,
    'EVENT_STARTED',
  ],
  [
    'cancelling after the start',
    async (m, host) => {
      const event = await createEvent(ctx.db, host.userId, 10);
      await register(event.id, m.cookie);
      await ctx.db.update(events).set({ startsAt: new Date() }).where(eq(events.id, event.id));
      return cancelMine(event.id, m.cookie);
    },
    409,
    'EVENT_STARTED',
  ],
  [
    'registering for a cancelled event',
    async (m, host) =>
      register((await createEvent(ctx.db, host.userId, 10, { status: 'cancelled' })).id, m.cookie),
    409,
    'EVENT_CANCELLED',
  ],
  [
    'double-submitting a registration',
    async (m, host) => {
      const event = await createEvent(ctx.db, host.userId, 10);
      const both = await Promise.all([register(event.id, m.cookie), register(event.id, m.cookie)]);
      expect(both.map((r) => r.statusCode).sort()).toEqual([201, 409]);
      return both.find((r) => r.statusCode === 409)!;
    },
    409,
    'ALREADY_REGISTERED',
  ],
  [
    'cancelling without a registration',
    async (m, host) => cancelMine((await createEvent(ctx.db, host.userId, 10)).id, m.cookie),
    404,
    'NOT_REGISTERED',
  ],
  [
    "an organizer removing an attendee of someone else's event",
    async (m, host) => {
      const olivia = await login(ctx.app, 'organizer');
      const event = await createEvent(ctx.db, host.userId, 10);
      const { id } = (await register(event.id, m.cookie)).json<{ id: string }>();
      return ctx.app.inject({
        method: 'POST',
        url: `/api/v1/registrations/${id}/cancel`,
        headers: { cookie: olivia.cookie },
      });
    },
    403,
    'FORBIDDEN',
  ],
])('rejects %s', async (_, act, status, code) => {
  const [member, host] = await Promise.all([signedInMember(ctx.db), signedInMember(ctx.db)]);
  const res = await act(member, host);
  expect([res.statusCode, res.json().code]).toEqual([status, code]);
});
