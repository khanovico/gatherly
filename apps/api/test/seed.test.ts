import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { resetDemo } from '../src/db/seed';
import { startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

it('seeds seat counts from real registrations, with some events full, on every reset', async () => {
  await resetDemo(ctx.db);
  await resetDemo(ctx.db);
  const { rows } = await ctx.db.execute<{
    title: string;
    seats: number;
    capacity: number;
    confirmed: number;
  }>(sql`
    select e.title, e.registered_count as seats, e.capacity, count(r.id)::int as confirmed
    from events e
    left join registrations r on r.event_id = e.id and r.status = 'confirmed'
    group by e.id`);
  expect(rows.filter((e) => e.seats !== e.confirmed)).toEqual([]);
  expect(rows.some((e) => e.seats === e.capacity)).toBe(true);
});
