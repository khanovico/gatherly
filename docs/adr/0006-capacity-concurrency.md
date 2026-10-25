# 0006. Capacity enforced by a locked conditional read and a counter the database maintains

- **Status:** Accepted (amended 2026-10-25: counter maintained by a trigger, lock timeout, one clock)
- **Date:** 2026-10-25

## Context

The core correctness rule: an event must never have more confirmed registrations than its capacity, even when many people try to take the last seats at the same moment. A naive "count, then insert" lets two requests both see a free seat and both insert.

The first version gated registration with a conditional `UPDATE events SET registered_count + 1 WHERE registered_count < capacity` and decremented in application code on cancel. That was race-safe, but the counter was only right as long as every code path that touched registration rows remembered to move it. The schema already had one that did not: `registrations.user_id` cascades on user delete, so deleting a member would have left phantom seats. Nothing checked the invariant, cancel used the application clock while register used the database's, and a very hot event could queue every request on one row for as long as the pool lasted.

## Decision

1. **The registration row is the seat; the counter follows the rows.** A database trigger (`registrations_seat_count`, migration 0003) adjusts `events.registered_count` on every insert, status change and delete of a seat-holding registration (`pending_payment`, `confirmed`). No handler, cascade or manual fix can leave the two apart. A second trigger refuses to move a registration between events, which the first relies on.
2. **Registration locks the event row with a conditional read.** In one transaction: `SELECT … FROM events WHERE id = ? AND published AND registered_count < capacity AND starts_at > now() FOR UPDATE`, then `INSERT` the registration (the trigger increments). Under READ COMMITTED a caller that had to wait re-evaluates the conditions against the committed row, so two requests for the last seat cannot both pass. If no row matches, a second read says why: not found, `EVENT_FULL`, `EVENT_STARTED` or `EVENT_CANCELLED`.
3. **A partial unique index** on `(event_id, user_id)` over active statuses turns a duplicate into `ALREADY_REGISTERED`; the rollback undoes the trigger's increment.
4. **Cancel is the mirror** and releases any active status, a payment hold included: lock the event row, set the registration to `cancelled`, the trigger decrements. Both paths lock the event row before the registration row, so a register and a cancel racing on one event wait for each other instead of deadlocking.
5. **One clock.** "Has the event started" is `starts_at <= now()` evaluated in Postgres for register, cancel, edit and event cancellation. App instances with skewed clocks cannot disagree.
6. **Bounded waiting.** Register and cancel run with `lock_timeout` set to `SEAT_LOCK_TIMEOUT_MS` (default 3 s). A request that cannot get the row in time answers `503 EVENT_BUSY` and the client retries, so one very hot event degrades to "try again" instead of holding every connection.
7. **The invariant is checked, not assumed.** `GET /admin/integrity/seats` lists events whose counter differs from their rows (always empty), and the test suite asserts the same after concurrent load. A check constraint keeps `registered_count` between zero and capacity as the last line.

Tests: 25 parallel registrations for 10 seats end with exactly 10 confirmations and 15 `EVENT_FULL`; 20 members each registering, cancelling and registering again at once for 8 seats end with the counter equal to the rows; deleting a member frees the seat; a held event row answers `EVENT_BUSY`; the drift query is empty.

## Alternatives considered

| Option | Verdict |
|---|---|
| Count registrations, then insert | Overbooks under concurrency |
| Conditional `UPDATE` on the counter, counter moved by application code (first version) | Correct for the race; the invariant rests on convention and had already been broken by a cascade |
| Lock the event row, then `COUNT(*)` the rows, no counter | Correct and drift-free; one more query under the lock and a count on every read of a list. The trigger gives the same guarantee and keeps the cheap column |
| Serializable isolation with retries | Correct, but every caller needs retry logic, and hot events cause abort storms |
| Counter in Redis or a queue | Extra infrastructure and two stores to keep consistent |
| Advisory locks | Correct, but the guarantee lives in application code rather than the schema |

## Consequences

- Postgres decides the winner; no application-level locking or retries.
- Any code that inserts, cancels or deletes registrations gets the counter right for free, including the demo seed and reset and a future account-deletion flow.
- The lock is held for one short transaction per registration, and never longer than the lock timeout.
- All registrations for one event still serialize on one row. That caps throughput for a single very hot event, not for the platform; now the symptom is `EVENT_BUSY`, not a stalled pool.
- A cascade delete locks registration rows before the event row, the reverse of register and cancel. Postgres detects the rare deadlock between a member's deletion and a concurrent cancel of their registration and aborts one side; the API answers 500 and the client retries. Account deletion will cancel registrations before deleting the user, which removes the case ([ADR 0010](0010-interaction-data.md)).
- The same locked read reserves a seat for paid checkout later (status `pending_payment` with a hold expiry), so paid tickets cannot oversell either, and an expired hold is released by the same cancel path.

**Revisit when** one event draws enough simultaneous demand that clients see `EVENT_BUSY` under normal use: put a virtual waiting room in front of registration, or split seat inventory into several counter rows.
