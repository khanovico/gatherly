import { and, eq, gt, sql } from 'drizzle-orm';
import type { Db } from './client';
import { PERSONAS, ensurePersonas } from './personas';
import { events, plans, registrations, subscriptions, userProfiles, users } from './schema';
import { DEMO_EVENTS } from './seed-data';
import { generateMembers } from './seed-members';
import { createRandom } from './seed-random';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
// Serializes resets across app instances booting at the same time.
const SEED_LOCK = 802_611;
const MEMBER_COUNT = 200;

/** "Tomás Rivera" → "tomas.rivera@gatherly.demo" */
const memberEmail = (name: string) =>
  `${name
    .normalize('NFD')
    .replace(/[^\w ]/g, '')
    .toLowerCase()
    .replace(' ', '.')}@gatherly.demo`;

/** `days` from today at the wall-clock time `at` ("18:30") in `timeZone`. */
const localTime = (now: Date, days: number, at: string, timeZone: string) => {
  const [hour = 0, minute = 0] = at.split(':').map(Number);
  const wall = new Date(now);
  wall.setUTCDate(wall.getUTCDate() + days);
  wall.setUTCHours(hour, minute, 0, 0);
  const inZone = new Date(wall.toLocaleString('en-US', { timeZone }));
  const inUtc = new Date(wall.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(+wall - (+inZone - +inUtc));
};

const insertDemoContent = async (tx: Tx, now: Date) => {
  const random = createRandom(20_261_026);
  const seeds = generateMembers(random, now, MEMBER_COUNT);
  const members = await tx
    .insert(users)
    .values(
      seeds.map(({ profile: _, ...member }) => ({ ...member, email: memberEmail(member.name) })),
    )
    .returning({ id: users.id, name: users.name });
  await tx
    .insert(userProfiles)
    .values(
      seeds.flatMap(({ profile }, i) => (profile ? [{ ...profile, userId: members[i]!.id }] : [])),
    );
  const [premium] = await tx.select({ id: plans.id }).from(plans).where(eq(plans.code, 'premium'));
  const organizers = new Set(DEMO_EVENTS.map((e) => e.organizer));
  const organizerPlans = members
    .filter((m) => organizers.has(m.name))
    .map((m) => ({ userId: m.id, planId: premium!.id, provider: 'mock' as const }));
  if (organizerPlans.length) await tx.insert(subscriptions).values(organizerPlans);

  const personas = await tx
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.isProtected, true));
  const idOf = new Map([...members, ...personas].map((u) => [u.name, u.id]));

  for (const [i, { when, cover, going, alex, organizer, ...event }] of DEMO_EVENTS.entries()) {
    const startsAt = localTime(now, when.days, when.at, event.timezone);
    const createdAt = new Date(Math.min(+now, +startsAt) - 21 * DAY_MS);
    // Rotate through the members so each event draws a different crowd.
    const shift = (i * 3) % members.length;
    const crowd = [...members.slice(shift), ...members.slice(0, shift)].slice(0, going);
    const attendeeIds = crowd.map((m) => m.id);
    if (alex) attendeeIds.unshift(idOf.get(PERSONAS.attendee.name)!);
    const [row] = await tx
      .insert(events)
      .values({
        ...event,
        organizerId: idOf.get(organizer ?? PERSONAS.organizer.name)!,
        startsAt,
        endsAt: new Date(+startsAt + when.hours * HOUR_MS),
        registeredCount: attendeeIds.length,
        coverImage: `/images/covers/${event.category}-${cover}.webp`,
        createdAt,
      })
      .returning({ id: events.id });
    if (!attendeeIds.length) continue;
    await tx.insert(registrations).values(
      attendeeIds.map((userId, j) => ({
        eventId: row!.id,
        userId,
        createdAt: new Date(+createdAt + (j + 1) * 7 * HOUR_MS),
      })),
    );
  }
};

/** Wipes every event and non-persona user, then reseeds with dates relative to now. */
export const resetDemo = async (db: Db) => {
  await ensurePersonas(db);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SEED_LOCK})`);
    await tx.delete(events); // cascades to registrations
    await tx.delete(users).where(eq(users.isProtected, false)); // cascades to sessions, subscriptions
    await insertDemoContent(tx, new Date());
  });
};

/** Boot hook: seeds a fresh database and refreshes a demo whose events are all in the past. */
export const seedIfStale = async (db: Db) => {
  const [upcoming] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.status, 'published'), gt(events.startsAt, new Date())))
    .limit(1);
  if (upcoming) return false;
  await resetDemo(db);
  return true;
};
