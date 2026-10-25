import { randomUUID } from 'node:crypto';
import { NEIGHBORHOODS } from '@gatherly/shared';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { eventHides, registrations, userProfiles } from '../src/db/schema';
import { createEvent, fillSeats, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

it('ranks interest and distance above generic popularity, and never shows excluded events', async () => {
  const { db } = ctx;
  const [viewer, organizer] = [await signedInMember(db), await signedInMember(db)];
  const { id: neighborhood, lat, lng } = NEIGHBORHOODS.find((n) => n.id === 'park-slope')!;
  await db.insert(userProfiles).values({
    userId: viewer.userId,
    interests: ['outdoors', 'arts', 'food'],
    neighborhood,
    radiusKm: 5,
    onboardedAt: new Date(),
  });
  // A fresh tag keeps other tests' events out of the feed.
  const tag = `t${randomUUID().slice(0, 8)}`;
  const event = (extra: Parameters<typeof createEvent>[3] = {}, by = organizer.userId) =>
    createEvent(db, by, 50, { tags: [tag], ...extra });
  const nearbyHike = await event({
    category: 'outdoors',
    format: 'in_person',
    neighborhood,
    lat,
    lng,
  });
  const popularTalk = await event();
  await fillSeats(db, popularTalk.id, 45);
  const full = await event();
  await fillSeats(db, full.id, 50);
  await event({}, viewer.userId); // the viewer's own
  const [hidden, registered] = [await event(), await event()];
  await db.insert(eventHides).values({ userId: viewer.userId, eventId: hidden.id });
  await db.insert(registrations).values({ userId: viewer.userId, eventId: registered.id });

  const res = await ctx.app.inject({
    url: `/api/v1/events?tags=${tag}`,
    headers: { cookie: viewer.cookie },
  });

  const feed = res.json();
  expect(feed.rankerVersion).toBe('rules-v1');
  // Only these two: full, own, hidden and registered events never appear.
  expect(feed.items.map((e: { id: string }) => e.id)).toEqual([nearbyHike.id, popularTalk.id]);
  expect(feed.items[0].reasons.map((r: { kind: string }) => r.kind)).toEqual(
    expect.arrayContaining(['interest', 'distance']),
  );
});
