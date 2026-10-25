import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { resetDemo } from '../src/db/seed';
import { startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

it('seeds seat counts from real registrations, some events full, cancelled ones empty', async () => {
  await resetDemo(ctx.db);
  await resetDemo(ctx.db);
  const { rows } = await ctx.db.execute<{
    title: string;
    seats: number;
    capacity: number;
    confirmed: number;
    status: string;
  }>(sql`
    select e.title, e.status, e.registered_count as seats, e.capacity, count(r.id)::int as confirmed
    from events e
    left join registrations r on r.event_id = e.id and r.status = 'confirmed'
    group by e.id`);
  expect(rows.filter((e) => e.seats !== e.confirmed)).toEqual([]);
  expect(rows.some((e) => e.seats === e.capacity)).toBe(true);
  // A cancelled event has released every seat.
  const cancelled = rows.filter((e) => e.status === 'cancelled');
  expect(cancelled.length).toBeGreaterThan(0);
  expect(cancelled.filter((e) => e.seats > 0)).toEqual([]);
});
