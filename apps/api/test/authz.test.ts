import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { users } from '../src/db/schema';
import { createEvent, eventInput, login, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

const newEvent = eventInput();

const call = (method: 'GET' | 'POST' | 'PATCH', url: string, cookie?: string, payload?: object) =>
  ctx.app.inject({ method, url: `/api/v1${url}`, headers: cookie ? { cookie } : {}, payload });
const outcome = (res: Awaited<ReturnType<typeof call>>) => [res.statusCode, res.json().code];

it('creates events only with the premium entitlement', async () => {
  const alex = await login(ctx.app, 'attendee');
  const olivia = await login(ctx.app, 'organizer');

  expect(outcome(await call('POST', '/events', alex.cookie, newEvent))).toEqual([
    403,
    'ENTITLEMENT_REQUIRED',
  ]);
  expect((await call('POST', '/events', olivia.cookie, newEvent)).statusCode).toBe(201);
});

it('lets only the organizer or an admin edit and cancel an event', async () => {
  const olivia = await login(ctx.app, 'organizer');
  const sam = await login(ctx.app, 'admin');
  const other = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, olivia.userId, 10);
  const edit = (cookie: string) => call('PATCH', `/events/${event.id}`, cookie, { capacity: 15 });
  const cancel = (cookie: string) => call('POST', `/events/${event.id}/cancel`, cookie);

  expect(outcome(await edit(other.cookie))).toEqual([403, 'FORBIDDEN']);
  expect(outcome(await cancel(other.cookie))).toEqual([403, 'FORBIDDEN']);
  expect((await edit(olivia.cookie)).statusCode).toBe(200);
  expect((await edit(sam.cookie)).statusCode).toBe(200);
  expect((await cancel(sam.cookie)).json().status).toBe('cancelled');

  const own = await createEvent(ctx.db, olivia.userId, 10);
  expect((await call('POST', `/events/${own.id}/cancel`, olivia.cookie)).statusCode).toBe(200);
});

it('keeps /admin for admins and blocks suspended accounts', async () => {
  const member = await signedInMember(ctx.db);
  const sam = await login(ctx.app, 'admin');

  expect(outcome(await call('GET', '/admin/users'))).toEqual([401, 'UNAUTHENTICATED']);
  expect(outcome(await call('GET', '/admin/users', member.cookie))).toEqual([403, 'FORBIDDEN']);
  expect((await call('GET', '/admin/users', sam.cookie)).statusCode).toBe(200);

  await ctx.db.update(users).set({ status: 'suspended' }).where(eq(users.id, member.userId));
  expect(outcome(await call('GET', '/me', member.cookie))).toEqual([403, 'ACCOUNT_SUSPENDED']);
});
