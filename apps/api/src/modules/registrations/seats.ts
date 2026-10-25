import type { Registration } from '@gatherly/shared';
import { and, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { events, registrations } from '../../db/schema';
import { AppError } from '../../lib/errors';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const isUniqueViolation = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return (e.cause?.code ?? e.code) === '23505';
};

/** Why the conditional seat update matched nothing. */
const unavailable = async (tx: Tx, eventId: string, userId: string) => {
  const [event] = await tx
    .select({ status: events.status, startsAt: events.startsAt })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) return new AppError('NOT_FOUND', 404, 'Event not found');
  if (event.status === 'cancelled') return new AppError('EVENT_CANCELLED', 409);
  if (event.startsAt <= new Date()) return new AppError('EVENT_STARTED', 409);
  const active = await tx.$count(
    registrations,
    and(
      eq(registrations.eventId, eventId),
      eq(registrations.userId, userId),
      inArray(registrations.status, ['pending_payment', 'confirmed']),
    ),
  );
  if (active) return new AppError('ALREADY_REGISTERED', 409);
  return new AppError('EVENT_FULL', 409, 'No seats left');
};

/**
 * Takes a seat and records the registration in one transaction (ADR 0006).
 * The conditional increment serializes concurrent callers on the event row,
 * so the count can never pass capacity.
 */
export const takeSeat = (db: Db, eventId: string, userId: string) =>
  db.transaction(async (tx) => {
    const [seat] = await tx
      .update(events)
      .set({ registeredCount: sql`${events.registeredCount} + 1` })
      .where(
        and(
          eq(events.id, eventId),
          eq(events.status, 'published'),
          lt(events.registeredCount, events.capacity),
          gt(events.startsAt, sql`now()`),
        ),
      )
      .returning({ id: events.id });
    if (!seat) throw await unavailable(tx, eventId, userId);
    try {
      const [row] = await tx.insert(registrations).values({ eventId, userId }).returning();
      return row!;
    } catch (err) {
      // Rolling back also undoes the increment above.
      if (isUniqueViolation(err)) throw new AppError('ALREADY_REGISTERED', 409);
      throw err;
    }
  });

export const toRegistration = (row: typeof registrations.$inferSelect): Registration => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  cancelledAt: row.cancelledAt?.toISOString() ?? null,
});
