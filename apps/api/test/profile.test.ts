import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { registrations, users } from '../src/db/schema';
import { createEvent, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

it('onboards: neighborhood sets home, browser coordinates win, first onboarding time kept', async () => {
  const { cookie } = await signedInMember(ctx.db);
  const put = (payload: object) =>
    ctx.app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: { cookie }, payload });

  const before = await ctx.app.inject({ url: '/api/v1/me/profile', headers: { cookie } });
  expect(before.json()).toMatchObject({ interests: [], radiusKm: 10, onboardedAt: null });

  const first = await put({
    interests: ['tech', 'arts', 'food'],
    neighborhood: 'williamsburg',
    bio: 'Hi',
    onboarded: true,
  });
  expect(first.json()).toMatchObject({ bio: 'Hi', homeLat: 40.7081, homeLng: -73.9571 });

  const second = await put({ homeLat: 40.7, homeLng: -74, onboarded: true });
  expect(second.json()).toMatchObject({
    neighborhood: 'williamsburg',
    homeLat: 40.7,
    homeLng: -74,
  });
  expect(second.json().onboardedAt).toBe(first.json().onboardedAt);
});

it('shows upcoming hosting on a public profile and hides suspended users', async () => {
  const host = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, host.userId, 10);
  const view = () => ctx.app.inject({ url: `/api/v1/users/${host.userId}` });

  expect((await view()).json().hosting.map((e: { id: string }) => e.id)).toEqual([event.id]);
  await ctx.db.update(users).set({ status: 'suspended' }).where(eq(users.id, host.userId));
  expect((await view()).statusCode).toBe(404);
});

it('shows what a member is attending only to that member', async () => {
  const host = await signedInMember(ctx.db);
  const guest = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, host.userId, 10);
  await ctx.db.insert(registrations).values({ eventId: event.id, userId: guest.userId });
  const view = (cookie?: string) =>
    ctx.app.inject({ url: `/api/v1/users/${guest.userId}`, headers: cookie ? { cookie } : {} });

  expect((await view()).json().attending).toBeUndefined();
  expect((await view(host.cookie)).json().attending).toBeUndefined();
  expect((await view(guest.cookie)).json().attending.map((e: { id: string }) => e.id)).toEqual([
    event.id,
  ]);
});
