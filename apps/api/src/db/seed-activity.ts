import { randomUUID } from 'node:crypto';
import type { Surface } from '@gatherly/shared';
import { RuleBasedRanker } from '../ranking/rule-based';
import type { events, interactions } from './schema';
import { affinity, type AffinityEvent } from './seed-affinity';
import type { SeedMember } from './seed-members';
import type { Random } from './seed-random';

export type ActivityEvent = AffinityEvent &
  Pick<typeof events.$inferSelect, 'id' | 'organizerId' | 'status' | 'createdAt'>;
export type ActivityMember = { id: string; profile: SeedMember['profile']; saves?: number };
/** A registration or save: who, what and when. */
export type Mark = { userId: string; eventId: string; createdAt: Date };
type Interaction = typeof interactions.$inferInsert;

const MINUTE_MS = 60_000;
const WINDOW_MS = 21 * 24 * 60 * MINUTE_MS;
const RANKER_VERSION = new RuleBasedRanker().version;
const BROWSE_SURFACES = [
  ['discover_grid', 5],
  ['rail_for_you', 2],
  ['rail_near_you', 1.5],
  ['rail_popular', 1.5],
] as const satisfies (readonly [Surface, number])[];

const between = (random: Random, from: Date, to: Date) =>
  new Date(+from + random.next() * (+to - +from));

/** Each member saves a few upcoming events they are not going to, best fits first. */
export const planSaves = (
  random: Random,
  now: Date,
  members: ActivityMember[],
  events: ActivityEvent[],
  registered: Set<string>,
): Mark[] =>
  members.flatMap((m) => {
    const count =
      m.saves ??
      random.weighted([
        [0, 3],
        [1, 3],
        [2, 2],
        [3, 1],
        [4, 1],
      ] as const);
    return events
      .filter((e) => e.startsAt > now && e.status === 'published' && e.organizerId !== m.id)
      .filter((e) => !registered.has(`${m.id}:${e.id}`))
      .map((e) => ({ e, score: affinity(m.profile, e, random) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(({ e }) => ({
        userId: m.id,
        eventId: e.id,
        createdAt: between(random, e.createdAt, now),
      }));
  });

/** Impression → click → detail view → register/save leading up to a mark inside the window. */
const funnel = (random: Random, mark: Mark, type: 'register' | 'save'): Interaction[] => {
  const base = { userId: mark.userId, eventId: mark.eventId, rankerVersion: RANKER_VERSION };
  const tracked = { ...base, requestId: randomUUID(), surface: random.weighted(BROWSE_SURFACES) };
  const position = Math.floor(random.next() ** 2 * 12);
  const before = (minutes: number) => new Date(+mark.createdAt - minutes * MINUTE_MS);
  const steps: Interaction[] = [
    { ...tracked, type: 'impression', position, createdAt: before(random.int(3, 40)) },
    { ...tracked, type: 'click', position, createdAt: before(2) },
    { ...base, type: 'view', surface: 'event_detail', createdAt: before(1) },
    { ...base, type, surface: 'event_detail', createdAt: mark.createdAt },
  ];
  // About a third arrive from a shared link, so the funnel starts at the detail page.
  return random.chance(0.35) ? steps.slice(2) : steps;
};

/** Browsing sessions: a dozen impressions each, clicked more often when the category fits. */
const browse = (random: Random, now: Date, member: ActivityMember, events: ActivityEvent[]) =>
  Array.from({ length: random.int(3, 12) }, () => {
    const at = new Date(+now - random.next() * WINDOW_MS);
    const listed = events.filter(
      (e) => e.status === 'published' && e.createdAt < at && e.startsAt > at,
    );
    const session = { userId: member.id, rankerVersion: RANKER_VERSION, requestId: randomUUID() };
    const surface = random.weighted(BROWSE_SURFACES);
    return random.sample(listed, 12).flatMap((e, position): Interaction[] => {
      const shown = { ...session, eventId: e.id, surface, position };
      const rows: Interaction[] = [{ ...shown, type: 'impression', createdAt: at }];
      if (!random.chance(member.profile?.interests.includes(e.category) ? 0.1 : 0.03)) return rows;
      const later = (minutes: number) => new Date(+at + minutes * MINUTE_MS);
      return [
        ...rows,
        { ...shown, type: 'click', createdAt: later(1) },
        { ...session, eventId: e.id, type: 'view', surface: 'event_detail', createdAt: later(2) },
      ];
    });
  }).flat();

/** Three weeks of interactions that agree with the seeded registrations and saves. */
export const planInteractions = (
  random: Random,
  now: Date,
  members: ActivityMember[],
  events: ActivityEvent[],
  marks: { registrations: Mark[]; saves: Mark[] },
): Interaction[] => {
  const recent = (m: Mark) => +now - +m.createdAt < WINDOW_MS;
  return [
    ...members.flatMap((m) => browse(random, now, m, events)),
    ...marks.registrations.filter(recent).flatMap((m) => funnel(random, m, 'register')),
    ...marks.saves.filter(recent).flatMap((m) => funnel(random, m, 'save')),
  ];
};
