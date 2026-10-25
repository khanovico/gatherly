import { randomUUID } from 'node:crypto';
import type { EventFeed, EventListQuery, EventSummary, SortOrder } from '@gatherly/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { userProfiles } from '../db/schema';
import type { AuthUser } from '../lib/auth';
import { loadCandidates, type Candidate } from './candidates';
import { distanceKm, resolveOrigin, type Point, type ViewerProfile } from './geo';

export type Viewer = { id: string; profile: ViewerProfile | null } | null;
type Located = Candidate & { distanceKm?: number };

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

/** Fill rate plus saves (capped), roughly 0–2. */
export const popularity = (c: Candidate) =>
  c.registeredCount / c.capacity + Math.min(c.saves, 20) / 20;

const comparators: Record<Exclude<SortOrder, 'for_you'>, (a: Located, b: Located) => number> = {
  soonest: () => 0, // the pool comes soonest first and sort() is stable
  nearest: (a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE),
  popular: (a, b) => popularity(b) - popularity(a),
};

export const toSummary = (viewer: Viewer, c: Located): EventSummary => ({
  ...c,
  startsAt: c.startsAt.toISOString(),
  endsAt: c.endsAt.toISOString(),
  saved: viewer ? c.saved : undefined,
});

/** `GET /events`: filter in SQL, then sort and page the pool in memory. */
export const buildFeed = async (
  db: Db,
  query: EventListQuery,
  user: AuthUser | null,
): Promise<EventFeed> => {
  const { page, pageSize, radiusKm } = query;
  const viewer = await loadViewer(db, user);
  const origin = resolveOrigin(query, viewer?.profile ?? null);
  let items = locate(await loadCandidates(db, { ...query, viewerId: viewer?.id }), origin);
  // A radius means "in person, within reach": online events have no distance and drop out.
  if (radiusKm && origin) items = items.filter((c) => (c.distanceKm ?? Infinity) <= radiusKm);
  const sort = !query.sort || query.sort === 'for_you' ? 'popular' : query.sort;
  items.sort(comparators[sort]);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize).map((c) => toSummary(viewer, c)),
    page,
    pageSize,
    total: items.length,
    requestId: randomUUID(),
  };
};
