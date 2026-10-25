import { afterAll, beforeAll, expect, it } from 'vitest';
import { createEvent, login, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

const HOUR_MS = 60 * 60 * 1000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const valid = {
  title: 'Validation meetup',
  summary: 'Checks every rule',
  description: '',
  category: 'tech',
  format: 'online',
  onlineUrl: 'https://example.com/meet',
  startsAt: iso(48 * HOUR_MS),
  endsAt: iso(50 * HOUR_MS),
  timezone: 'America/New_York',
  capacity: 20,
};

it.each([
  ['ends before it starts', { endsAt: iso(47 * HOUR_MS) }, 400, 'VALIDATION_FAILED', ['endsAt']],
  ['starts in the past', { startsAt: iso(-HOUR_MS) }, 400, 'VALIDATION_FAILED', ['startsAt']],
  ['has no seats', { capacity: 0 }, 400, 'VALIDATION_FAILED', ['capacity']],
  ['has too many seats', { capacity: 10_001 }, 400, 'VALIDATION_FAILED', ['capacity']],
  ['sells tickets', { priceCents: 500 }, 422, 'PAID_TICKETS_UNAVAILABLE', undefined],
  ['is online without a URL', { onlineUrl: undefined }, 400, 'VALIDATION_FAILED', ['onlineUrl']],
  [
    'is in person without a venue',
    { format: 'in_person', onlineUrl: undefined },
    400,
    'VALIDATION_FAILED',
    ['venueName', 'city'],
  ],
])('rejects an event that %s', async (_, change, status, code, paths) => {
  const { cookie } = await login(ctx.app, 'organizer');
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/events',
    headers: { cookie },
    payload: { ...valid, ...change },
  });

  expect([res.statusCode, res.json().code]).toEqual([status, code]);
  if (paths) expect(res.json().errors.map((e: { path: string }) => e.path)).toEqual(paths);
});

it('refuses to lower capacity below confirmed registrations', async () => {
  const olivia = await login(ctx.app, 'organizer');
  const event = await createEvent(ctx.db, olivia.userId, 10);
  for (const member of [await signedInMember(ctx.db), await signedInMember(ctx.db)]) {
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/events/${event.id}/registrations`,
      headers: { cookie: member.cookie },
    });
  }

  const res = await ctx.app.inject({
    method: 'PATCH',
    url: `/api/v1/events/${event.id}`,
    headers: { cookie: olivia.cookie },
    payload: { capacity: 1 },
  });
  expect([res.statusCode, res.json().code]).toEqual([409, 'CAPACITY_BELOW_REGISTERED']);
});
