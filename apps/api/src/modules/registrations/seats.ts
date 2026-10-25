import type { EventSummary, Registration } from '@gatherly/shared';
import { and, eq, gt, inArray, lt, ne, sql, type SQL } from 'drizzle-orm';
import { config } from '../../config';
import type { Db } from '../../db/client';
import { events, registrations } from '../../db/schema';
import { AppError } from '../../lib/errors';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Statuses that hold a seat. The `registrations_seat_count` trigger counts the same two. */
export const ACTIVE_STATUSES = ['pending_payment', 'confirmed'] as const;

const pgCode = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.cause?.code ?? e.code;
};
const isUniqueViolation = (err: unknown) => pgCode(err) === '23505';
const isLockTimeout = (err: unknown) => pgCode(err) === '55P03';

/** One clock for "has it started": the database's, so app instances with skewed clocks agree. */
export const eventStarted = sql<boolean>`${events.startsAt} <= now()`;

/** Active registrations per event, from the rows. The counter must always equal this. */
const activeRows = sql<number>`(
  select count(*) from ${registrations} r
  where r.event_id = ${events.id} and r.status in ('pending_payment', 'confirmed'))`.mapWith(
  Number,
);

/**
 * A transaction that waits at most `SEAT_LOCK_TIMEOUT_MS` for the event row. On a very hot event
 * the caller gets `EVENT_BUSY` and a retry instead of a connection held in a queue, so one event
 * cannot exhaust the pool for every other request (ADR 0006).
 */
export const seatTransaction = <T>(db: Db, work: (tx: Tx) => Promise<T>) =>
  db
    .transaction(async (tx) => {
      await tx.execute(
        sql`set local lock_timeout = ${sql.raw(String(config.SEAT_LOCK_TIMEOUT_MS))}`,
      );
      return work(tx);
    })
    .catch((err: unknown) => {
      if (isLockTimeout(err)) {
        throw new AppError(
          'EVENT_BUSY',
          503,
          'Too many people are registering for this event right now; try again in a moment',
        );
      }
      throw err;
    });

/** Why the seat lookup matched nothing. */
const unavailable = async (tx: Tx, eventId: string, userId: string) => {
  const [event] = await tx
    .select({ status: events.status, started: eventStarted })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) return new AppError('NOT_FOUND', 404, 'Event not found');
  if (event.status === 'cancelled') return new AppError('EVENT_CANCELLED', 409);
  if (event.started) return new AppError('EVENT_STARTED', 409);
  const active = await tx.$count(
    registrations,
    and(
      eq(registrations.eventId, eventId),
      eq(registrations.userId, userId),
      inArray(registrations.status, ACTIVE_STATUSES),
    ),
  );
  if (active) return new AppError('ALREADY_REGISTERED', 409);
  return new AppError('EVENT_FULL', 409, 'No seats left');
};

/**
 * Takes a seat and records the registration in one transaction (ADR 0006).
 * The locking select serializes concurrent callers on the event row; a caller that had to wait
 * re-checks the conditions against the committed row, so the count can never pass capacity.
 * The registration row is the seat: the `registrations_seat_count` trigger moves the counter.
 */
export const takeSeat = (db: Db, eventId: string, userId: string) =>
  seatTransaction(db, async (tx) => {
    const [seat] = await tx
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.id, eventId),
          eq(events.status, 'published'),
          lt(events.registeredCount, events.capacity),
          gt(events.startsAt, sql`now()`),
        ),
      )
      .for('update');
    if (!seat) throw await unavailable(tx, eventId, userId);
    try {
      const [row] = await tx.insert(registrations).values({ eventId, userId }).returning();
      return row!;
    } catch (err) {
      // Rolling back also undoes the trigger's increment.
      if (isUniqueViolation(err)) throw new AppError('ALREADY_REGISTERED', 409);
      throw err;
    }
  });

/**
 * Cancels the matching active registration (confirmed, or a payment hold) in the caller's
 * transaction; the trigger frees the seat. Locks the event row before touching the registration,
 * the same order as `takeSeat`, so a register and a cancel running at once queue up instead of
 * deadlocking.
 */
export const releaseSeat = async (tx: Tx, match: SQL) => {
  const active = and(match, inArray(registrations.status, ACTIVE_STATUSES));
  const notRegistered = new AppError('NOT_REGISTERED', 404, 'No active registration');
  const [target] = await tx
    .select({ eventId: registrations.eventId })
    .from(registrations)
    .where(active);
  if (!target) throw notRegistered;
  const [event] = await tx
    .select({ started: eventStarted })
    .from(events)
    .where(eq(events.id, target.eventId))
    .for('update');
  // Re-checked under the lock: a concurrent cancel may have won.
  const [row] = await tx
    .update(registrations)
    .set({ status: 'cancelled', cancelledAt: sql`now()` })
    .where(active)
    .returning();
  if (!row) throw notRegistered;
  return { registration: row, started: event!.started };
};

/**
 * Events whose counter disagrees with their rows. Always empty: the trigger keeps them equal, the
 * tests assert it after concurrent load, and `GET /admin/integrity/seats` lets an operator check.
 */
export const seatDrift = (db: Db) =>
  db
    .select({
      eventId: events.id,
      registeredCount: events.registeredCount,
      activeRegistrations: activeRows,
    })
    .from(events)
    .where(ne(events.registeredCount, activeRows));

export const toRegistration = (row: typeof registrations.$inferSelect): Registration => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  cancelledAt: row.cancelledAt?.toISOString() ?? null,
});

export const toEventSummary = (row: typeof events.$inferSelect): EventSummary => ({
  ...row,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
});
