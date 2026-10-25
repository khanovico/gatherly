import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { users } from '../src/db/schema';
import { resetDemo } from '../src/db/seed';
import { login, signedInMember, startApp } from './setup';

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
