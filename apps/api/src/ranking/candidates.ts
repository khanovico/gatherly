import type { EventListQuery, SortOrder } from '@gatherly/shared';
import {
  and,
  arrayOverlaps,
  asc,
  desc,
  eq,
  exists,
  getTableColumns,
  gte,
  inArray,
  lt,
  lte,
  ne,
  not,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { Db } from '../db/client';
import { eventHides, eventSaves, events, registrations } from '../db/schema';
import { EARTH_RADIUS_KM, type Point } from './geo';

/**
 * `for_you` and the discover rails score the soonest POOL_LIMIT matches in memory, so their
 * `total` stops at the cap and the feed flags it (`totalCapped`). Plenty at demo scale; a larger
 * catalog would generate candidates per signal (interest, area, popularity) or score in a feature
 * store. The other sorts order and page in SQL (`page`) and are never capped.
 */
export const POOL_LIMIT = 500;

export type CandidateFilters = Partial<EventListQuery> & {
  viewerId?: string;
  /** Distances are measured from here; with `radiusKm`, only in-person events within it match. */
  origin?: Point | null;
  /** Recommendations: also drop full events and the viewer's own or registered ones. */
  recommend?: boolean;
};

/** One page in a fixed order instead of the pool. */
export type PageRequest = { sort: Exclude<SortOrder, 'for_you'>; page: number; pageSize: number };

/** Haversine distance in SQL, the same formula as geo.ts; null for online events. */
const distanceSql = ({ lat, lng }: Point) =>
  sql`${2 * EARTH_RADIUS_KM} * asin(sqrt(power(sin(radians(${events.lat} - ${lat}) / 2), 2) + cos(radians(${lat})) * cos(radians(${events.lat})) * power(sin(radians(${events.lng} - ${lng}) / 2), 2)))`;

const savesCount = sql<number>`(select count(*) from ${eventSaves} where ${eventSaves.eventId} = ${events.id})`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- never ship the tsvector
const { search, ...columns } = getTableColumns(events);

/**
 * Upcoming published events matching the filters, never ones the viewer hid: the soonest
 * POOL_LIMIT, or one sorted page with `total` (all matches) on each row.
 */
export const loadCandidates = (db: Db, f: CandidateFilters, page?: PageRequest) => {
  const { q, viewerId, origin } = f;
  const order =
    page &&
    {
      soonest: [],
      // popularity() in rule-based.ts: fill rate plus capped saves.
      popular: [
        desc(
          sql`${events.registeredCount}::float / ${events.capacity} + least(${savesCount}, 20) / 20.0`,
        ),
      ],
      // Without a location nothing has a distance, so this is soonest first.
      nearest: origin ? [sql`${distanceSql(origin)} asc nulls last`] : [],
    }[page.sort];
  const viewerHas = (table: typeof eventSaves | typeof registrations, extra?: SQL) =>
    exists(
      db
        .select({ one: sql`1` })
        .from(table)
        .where(and(eq(table.eventId, events.id), eq(table.userId, viewerId!), extra)),
    );
  return db.transaction(async (tx) => {
    // The default bar (0.6) misses one-letter typos in short words: "yogga" → "Yoga" is 0.57.
    if (q)
      await tx.execute(sql`select set_config('pg_trgm.word_similarity_threshold', '0.5', true)`);
    return tx
      .select({
        ...columns,
        saves: savesCount.mapWith(Number),
        saved: viewerId ? viewerHas(eventSaves).mapWith(Boolean) : sql<boolean>`false`,
        relevance: q
          ? sql<number>`ts_rank(${events.search}, websearch_to_tsquery('english', ${q})) + word_similarity(${q}, ${events.title})`.mapWith(
              Number,
            )
          : sql<number>`0`.mapWith(Number),
        total: (page ? sql`count(*) over ()` : sql`0`).mapWith(Number),
      })
      .from(events)
      .where(
        and(
          eq(events.status, 'published'),
          gte(events.startsAt, f.from ? new Date(f.from) : new Date()),
          f.to ? lte(events.startsAt, new Date(f.to)) : undefined,
          f.category ? eq(events.category, f.category) : undefined,
          f.tags?.length ? arrayOverlaps(events.tags, f.tags) : undefined,
          f.format ? eq(events.format, f.format) : undefined,
          f.freeOnly ? eq(events.priceCents, 0) : undefined,
          // Full-text match, or a trigram match on the title that tolerates typos.
          q
            ? sql`(${events.search} @@ websearch_to_tsquery('english', ${q}) or ${q} <% ${events.title})`
            : undefined,
          // A radius means "in person, within reach": online events have no distance and drop out.
          f.radiusKm && origin ? lte(distanceSql(origin), f.radiusKm) : undefined,
          viewerId ? not(viewerHas(eventHides)) : undefined,
          f.recommend ? lt(events.registeredCount, events.capacity) : undefined,
          f.recommend && viewerId ? ne(events.organizerId, viewerId) : undefined,
          f.recommend && viewerId
            ? not(
                viewerHas(
                  registrations,
                  inArray(registrations.status, ['pending_payment', 'confirmed']),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(...(order ?? []), asc(events.startsAt), asc(events.id))
      .limit(page?.pageSize ?? POOL_LIMIT)
      .offset(page ? (page.page - 1) * page.pageSize : 0);
  });
};

export type Candidate = Awaited<ReturnType<typeof loadCandidates>>[number];
