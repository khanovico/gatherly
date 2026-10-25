# 0006. Capacity enforced by an atomic conditional update

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

The core correctness rule: an event must never have more confirmed registrations than its capacity, even when many people try to take the last seats at the same moment. A naive "count, then insert" lets two requests both see a free seat and both insert.

## Decision

Registration runs in one transaction:

1. Increment `registered_count` on the event **only if** the event is published, has not started, and the count is below capacity. This is a single conditional update.
2. If no row changed, read the event and return the precise reason: not found, `EVENT_FULL`, `EVENT_STARTED` or `EVENT_CANCELLED`.
3. Insert the registration. A partial unique index on event and user, covering only active statuses, turns a duplicate into `ALREADY_REGISTERED` and the transaction rolls back the increment.

Cancel is the mirror: mark the registration cancelled and decrement the counter in the same transaction. A check constraint keeps `registered_count` at or below capacity as a backstop.

An integration test sends 25 parallel registrations to a 10-seat event and asserts exactly 10 confirmations, 15 `EVENT_FULL` responses and a final count of 10.

## Alternatives considered

| Option | Verdict |
|---|---|
| Count registrations, then insert | Overbooks under concurrency |
| Lock the event row first, then count and insert | Correct, but more round trips while holding the lock |
| Serializable isolation with retries | Correct, but every caller needs retry logic, and hot events cause abort storms |
| Counter in Redis or a queue | Extra infrastructure and two stores to keep consistent |
| Advisory locks | Correct, but the guarantee lives in application code rather than the schema |

## Consequences

- Postgres decides the winner; no application-level locking or retries.
- The lock is held only for one short transaction per registration.
- All registrations for one event serialize on one row. That caps throughput for a single very hot event (think thousands of requests per second for a famous speaker), not for the platform.
- The same update reserves a seat for paid checkout later (status `pending_payment` with a hold expiry), so paid tickets cannot oversell either.

**Revisit when** one event draws enough simultaneous demand to queue on its row: put a virtual waiting room in front of registration, or split seat inventory into several counter rows.
