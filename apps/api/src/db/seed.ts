import { NEIGHBORHOODS } from '@gatherly/shared';
import { and, eq, gt, sql } from 'drizzle-orm';
import type { Db } from './client';
import type { Persona } from '@gatherly/shared';
import { PERSONAS, ensurePersonas } from './personas';
import { events, plans, registrations, subscriptions, userProfiles, users } from './schema';
import { DEMO_EVENTS, type DemoEvent } from './seed-data';
import { HOSTS, PERSONA_PROFILES, generateMembers } from './seed-members';
import { affinity } from './seed-affinity';
import { createRandom } from './seed-random';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
// Serializes resets across app instances booting at the same time.
const SEED_LOCK = 802_611;
const MEMBER_COUNT = 200;
const TIMEZONE = 'America/New_York';

/** "Tomás Rivera" → "tomas.rivera@gatherly.demo" */
const memberEmail = (name: string) =>
  `${name
    .normalize('NFD')
    .replace(/[^\w ]/g, '')
    .toLowerCase()
    .replace(' ', '.')}@gatherly.demo`;

const WEEKEND_DAY = { sat: 6, sun: 0 };

/** `days` from today (then forward to the next `on` day) at the wall-clock time `at` in `timeZone`. */
const localTime = (now: Date, { days, at, on }: DemoEvent['when'], timeZone: string) => {
  const [hour = 0, minute = 0] = at.split(':').map(Number);
  const wall = new Date(now);
  wall.setUTCDate(wall.getUTCDate() + days);
  if (on) wall.setUTCDate(wall.getUTCDate() + ((WEEKEND_DAY[on] - wall.getUTCDay() + 7) % 7));
  wall.setUTCHours(hour, minute, 0, 0);
  const inZone = new Date(wall.toLocaleString('en-US', { timeZone }));
  const inUtc = new Date(wall.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(+wall - (+inZone - +inUtc));
};

const resetPersonaProfiles = async (tx: Tx, now: Date) => {
  for (const [persona, { bio, profile }] of Object.entries(PERSONA_PROFILES)) {
    const [user] = await tx
      .update(users)
      .set({ bio })
      .where(eq(users.email, PERSONAS[persona as Persona].email))
      .returning({ id: users.id });
    const row = { homeLat: null, homeLng: null, ...profile, userId: user!.id, onboardedAt: now };
    await tx
      .insert(userProfiles)
      .values(row)
      .onConflictDoUpdate({ target: userProfiles.userId, set: row });
  }
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
  await resetPersonaProfiles(tx, now);
  const [premium] = await tx.select({ id: plans.id }).from(plans).where(eq(plans.code, 'premium'));
  await tx
    .insert(subscriptions)
    .values(
      members
        .filter((m) => HOSTS.includes(m.name))
        .map((m) => ({ userId: m.id, planId: premium!.id, provider: 'mock' as const })),
    );

  const personas = await tx
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.isProtected, true));
  const idOf = new Map([...members, ...personas].map((u) => [u.name, u.id]));

  const crowd = members.map((m, i) => ({ id: m.id, profile: seeds[i]!.profile }));
  const planned = DEMO_EVENTS.map(({ when, cover, going, alex, organizer, ...fixture }) => {
    const startsAt = localTime(now, when, TIMEZONE);
    const hood = NEIGHBORHOODS.find((n) => n.id === fixture.neighborhood);
    // Venues sit within ~500 m of their neighborhood's center.
    const jitter = () => (random.next() - 0.5) * 0.01;
    const event = {
      ...fixture,
      timezone: TIMEZONE,
      city: hood && (hood.borough === 'Manhattan' ? 'New York' : hood.borough),
      lat: hood ? hood.lat + jitter() : null,
      lng: hood ? hood.lng + jitter() : null,
      organizerId: idOf.get(organizer ?? PERSONAS.organizer.name)!,
      startsAt,
      endsAt: new Date(+startsAt + when.hours * HOUR_MS),
      coverImage: `/images/covers/${fixture.category}-${cover}.webp`,
      // Published 3–28 days before now (or before the start, for past events).
      createdAt: new Date(Math.min(+now, +startsAt) - random.int(3, 28) * DAY_MS),
    };
    // The members whose preferences fit best take the seats.
    const attendeeIds = crowd
      .filter((m) => m.id !== event.organizerId)
      .map((m) => ({ id: m.id, score: affinity(m.profile, event, random) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, going)
      .map((m) => m.id);
    if (alex) attendeeIds.push(idOf.get(PERSONAS.attendee.name)!);
    return { event: { ...event, registeredCount: attendeeIds.length }, attendeeIds };
  });

  const rows = await tx
    .insert(events)
    .values(planned.map((p) => p.event))
    .returning({ id: events.id });
  await tx.insert(registrations).values(
    planned.flatMap(({ event, attendeeIds }, i) => {
      // Sign-ups spread from publication until now, or until the start for past events.
      const window = Math.min(+now, +event.startsAt) - +event.createdAt;
      return attendeeIds.map((userId) => ({
        eventId: rows[i]!.id,
        userId,
        createdAt: new Date(+event.createdAt + random.next() * window),
      }));
    }),
  );
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
