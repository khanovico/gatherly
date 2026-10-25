import type { Category, ReasonKind, TimeSlot } from '@gatherly/shared';
import type { Candidate } from './candidates';
import type { Located, Ranked, RankContext, Ranker, Reason } from './ranker';

/** Score weights: one point is roughly one clear reason to show an event. */
export const WEIGHTS = {
  interest: 3, // category is one of the viewer's interests
  tag: 1, // per tag shared with the viewer, up to MAX_TAG_MATCHES
  distance: 2, // in person; decays linearly to 0 at the viewer's radius
  timeSlot: 1, // starts in one of the viewer's time slots
  popularity: 1, // × popularity(), about 0–2
  isNew: 0.5, // listed within NEW_DAYS
  soon: 0.5, // decays to 0 over SOON_DAYS
  relevance: 2, // × search relevance when there is a query
  formatMismatch: -2, // a format the viewer did not pick
};
const MAX_TAG_MATCHES = 2;
export const DEFAULT_RADIUS_KM = 10;
const NEW_DAYS = 7;
const SOON_DAYS = 30;
const MAX_REASONS = 3;
// Diversity: at most this many events per category in the top slots.
const DIVERSE_TOP = 8;
const MAX_PER_CATEGORY = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fill rate plus saves (capped), about 0–2. */
export const popularity = (c: Candidate) =>
  c.registeredCount / c.capacity + Math.min(c.saves, 20) / 20;

/** Time slot and a label like "Friday evening", in the event's own time zone. */
export const timeOfWeek = (at: Date, timeZone: string): { slot: TimeSlot; label: string } => {
  const weekday = at.toLocaleString('en-US', { timeZone, weekday: 'long' });
  const hour = Number(at.toLocaleString('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }));
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const weekend = weekday === 'Saturday' || weekday === 'Sunday';
  const slot = weekend ? 'weekends' : hour >= 17 ? 'weeknights' : 'weekday_daytime';
  return { slot, label: `${weekday} ${part}` };
};

const categoryLabel = (c: Category) => c[0]!.toUpperCase() + c.slice(1);

type Term = { value: number; reason?: Reason };
const term = (value: number, kind?: ReasonKind, label?: string | null): Term => ({
  value,
  reason: kind && label ? { kind, label } : undefined,
});

const terms = (c: Located, { profile: p, now }: RankContext): Term[] => {
  const time = timeOfWeek(c.startsAt, c.timezone);
  const tags = p ? c.tags.filter((t) => p.tags.includes(t)).slice(0, MAX_TAG_MATCHES) : [];
  const km = c.distanceKm;
  const nearness = km === undefined ? 0 : Math.max(0, 1 - km / (p?.radiusKm ?? DEFAULT_RADIUS_KM));
  const fill = c.registeredCount / c.capacity;
  const popular =
    fill >= 0.6 ? `${Math.round(fill * 100)}% full` : c.saves >= 5 ? `Saved by ${c.saves}` : null;
  const daysAway = (c.startsAt.getTime() - now.getTime()) / DAY_MS;
  const isNew = now.getTime() - c.createdAt.getTime() < NEW_DAYS * DAY_MS;
  const interest = p?.interests.includes(c.category) ? WEIGHTS.interest : 0;
  return [
    term(interest, 'interest', `Because you like ${categoryLabel(c.category)}`),
    term(tags.length * WEIGHTS.tag, 'tag', `#${tags[0]}`),
    term(WEIGHTS.distance * nearness, 'distance', km! < 0.5 ? 'In your area' : `${km} km away`),
    term(p?.timeSlots.includes(time.slot) ? WEIGHTS.timeSlot : 0, 'time', time.label),
    term(WEIGHTS.popularity * popularity(c), 'popular', popular),
    term(isNew ? WEIGHTS.isNew : 0, 'new', 'New this week'),
    term(WEIGHTS.soon * Math.max(0, 1 - daysAway / SOON_DAYS)),
    term(WEIGHTS.relevance * c.relevance),
    term(p && !p.formats.includes(c.format) ? WEIGHTS.formatMismatch : 0),
  ];
};

/** Keeps the top slots varied: later events of a crowded category move just below them. */
const diversify = (ranked: Ranked[]) => {
  const top: Ranked[] = [];
  const rest: Ranked[] = [];
  const perCategory = new Map<Category, number>();
  for (const r of ranked) {
    const n = perCategory.get(r.category) ?? 0;
    if (top.length < DIVERSE_TOP && n < MAX_PER_CATEGORY) {
      top.push(r);
      perCategory.set(r.category, n + 1);
    } else rest.push(r);
  }
  return [...top, ...rest];
};

/**
 * Hand-tuned, explainable scoring: a weighted sum of terms, then a diversity rerank. Reasons are
 * the strongest terms.
 */
export class RuleBasedRanker implements Ranker {
  readonly version = 'rules-v1';

  rank(candidates: Located[], ctx: RankContext): Ranked[] {
    const ranked = candidates.map((c) => {
      const scored = terms(c, ctx);
      const reasons = scored
        .filter((t) => t.reason && t.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, MAX_REASONS)
        .map((t) => t.reason!);
      return { ...c, score: scored.reduce((sum, t) => sum + t.value, 0), reasons };
    });
    return diversify(ranked.sort((a, b) => b.score - a.score));
  }
}

export const ranker: Ranker = new RuleBasedRanker();
