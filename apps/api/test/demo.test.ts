import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { registrations, users } from '../src/db/schema';
import { resetDemo } from '../src/db/seed';
import { createEvent, login, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

// Tests run with DEMO_MODE=true: the public demo, where anyone can be the admin.
it('keeps real accounts private, read-only and out of the demo reset', async () => {
  const real = await signedInMember(ctx.db);
  const name = `Real ${real.userId}`;
  const [{ email }] = (await ctx.db
    .update(users)
    .set({ name })
    .where(eq(users.id, real.userId))
    .returning({ email: users.email })) as [{ email: string }];
  const sam = await login(ctx.app, 'admin');
  const admin = (method: 'GET' | 'PATCH', url: string, payload?: object) =>
    ctx.app.inject({ method, url: `/api/v1${url}`, headers: { cookie: sam.cookie }, payload });

  const listed = await admin('GET', `/admin/users?q=${email.split('@')[0]}`);
  expect(listed.json().items).toEqual([]);
  const [row] = (await admin('GET', `/admin/users?q=${name}`)).json().items;
  expect(row).toMatchObject({ email: `${email[0]}***@test.gatherly`, protected: true });

  const patch = await admin('PATCH', `/admin/users/${real.userId}`, { status: 'suspended' });
  expect([patch.statusCode, patch.json().code]).toEqual([403, 'FORBIDDEN']);

  await resetDemo(ctx.db);
  expect(await ctx.db.$count(users, eq(users.id, real.userId))).toBe(1);
});

it('lets the demo admin view but not change events that real accounts host', async () => {
  const host = await signedInMember(ctx.db);
  const guest = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, host.userId, 10, { registeredCount: 1 });
  const [seat] = await ctx.db
    .insert(registrations)
    .values({ eventId: event.id, userId: guest.userId })
    .returning();
  const sam = await login(ctx.app, 'admin');
  const admin = (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) =>
    ctx.app.inject({ method, url: `/api/v1${url}`, headers: { cookie: sam.cookie }, payload });

  expect((await admin('GET', `/events/${event.id}/registrations`)).statusCode).toBe(200);
  for (const res of [
    await admin('PATCH', `/events/${event.id}`, { capacity: 20 }),
    await admin('POST', `/events/${event.id}/cancel`),
    await admin('POST', `/registrations/${seat!.id}/cancel`),
  ]) {
    expect([res.statusCode, res.json().code]).toEqual([403, 'FORBIDDEN']);
  }
});
