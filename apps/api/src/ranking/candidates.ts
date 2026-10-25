import type { EventListQuery } from '@gatherly/shared';
import {
  and,
  arrayOverlaps,
  asc,
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

/** Every sort ranks and pages at most this many matches (soonest first) in memory. Plenty at
 * demo scale; a larger catalog would score in SQL or a feature store. */
export const POOL_LIMIT = 500;

export type CandidateFilters = Partial<EventListQuery> & {
  viewerId?: string;
  /** Recommendations: also drop full events and the viewer's own or registered ones. */
  recommend?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- never ship the tsvector
const { search, ...columns } = getTableColumns(events);

/** Upcoming published events matching the filters, never ones the viewer hid. */
export const loadCandidates = (db: Db, f: CandidateFilters) => {
  const { q, viewerId } = f;
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
        saves: db.$count(eventSaves, eq(eventSaves.eventId, events.id)),
        saved: viewerId ? viewerHas(eventSaves).mapWith(Boolean) : sql<boolean>`false`,
        relevance: q
          ? sql<number>`ts_rank(${events.search}, websearch_to_tsquery('english', ${q})) + word_similarity(${q}, ${events.title})`.mapWith(
              Number,
            )
          : sql<number>`0`.mapWith(Number),
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
      .orderBy(asc(events.startsAt), asc(events.id))
      .limit(POOL_LIMIT);
  });
};

export type Candidate = Awaited<ReturnType<typeof loadCandidates>>[number];
