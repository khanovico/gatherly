import { randomUUID } from 'node:crypto';
import type { EventFeed, EventListQuery, EventSummary, SortOrder } from '@gatherly/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { userProfiles } from '../db/schema';
import type { AuthUser } from '../lib/auth';
import { loadCandidates, type Candidate } from './candidates';
import { distanceKm, resolveOrigin, type Point, type ViewerProfile } from './geo';
import type { Located, Ranked } from './ranker';
import { popularity, ranker } from './rule-based';

export type Viewer = { id: string; profile: ViewerProfile | null } | null;

export const loadViewer = async (db: Db, user: AuthUser | null): Promise<Viewer> => {
  if (!user) return null;
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id));
  return { id: user.id, profile: profile ?? null };
};

export const locate = (candidates: Candidate[], origin: Point | null): Located[] =>
  candidates.map((c) => {
    const at = c.lat !== null && c.lng !== null ? { lat: c.lat, lng: c.lng } : null;
    const km = origin && at ? distanceKm(origin, at) : undefined;
    return { ...c, distanceKm: km === undefined ? undefined : Math.round(km * 10) / 10 };
  });

const comparators: Record<Exclude<SortOrder, 'for_you'>, (a: Located, b: Located) => number> = {
  soonest: (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  nearest: (a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE),
  popular: (a, b) => popularity(b) - popularity(a),
};

export const toSummary = (viewer: Viewer, c: Ranked): EventSummary => ({
  ...c,
  startsAt: c.startsAt.toISOString(),
  endsAt: c.endsAt.toISOString(),
  saved: viewer ? c.saved : undefined,
});

/** `GET /events`: filter in SQL, then rank (or sort) and page the pool in memory. */
export const buildFeed = async (
  db: Db,
  query: EventListQuery,
  user: AuthUser | null,
): Promise<EventFeed> => {
  const { page, pageSize, radiusKm } = query;
  const viewer = await loadViewer(db, user);
  const profile = viewer?.profile ?? null;
  const origin = resolveOrigin(query, profile);
  const sort = query.sort ?? (profile?.onboardedAt ? 'for_you' : 'popular');
  const pool = await loadCandidates(db, {
    ...query,
    viewerId: viewer?.id,
    recommend: sort === 'for_you',
  });
  let located = locate(pool, origin);
  // A radius means "in person, within reach": online events have no distance and drop out.
  if (radiusKm && origin) located = located.filter((c) => (c.distanceKm ?? Infinity) <= radiusKm);
  // Every sort carries the ranker's reasons; only for_you keeps its order.
  const items = ranker.rank(located, { profile, now: new Date() });
  if (sort !== 'for_you') items.sort(comparators[sort]);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize).map((c) => toSummary(viewer, c)),
    page,
    pageSize,
    total: items.length,
    rankerVersion: ranker.version,
    requestId: randomUUID(),
  };
};
