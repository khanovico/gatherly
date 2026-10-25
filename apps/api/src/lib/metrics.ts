import type { ErrorCode } from '@gatherly/shared';
import { metrics } from '@opentelemetry/api';

// telemetry.ts registers the meter provider before the app loads; without it these are no-ops.
// Grafana stores counters with a `_total` suffix, e.g. `registrations_total{result}`. Label values
// are lowercase: `confirmed`, or the refusing error code (`EVENT_FULL` → `event_full`).
const meter = metrics.getMeter('gatherly-api');
const registrations = meter.createCounter('registrations', {
  description: 'Registration attempts by result',
});
const cancellations = meter.createCounter('cancellations', {
  description: 'Registrations cancelled',
});
const eventsCreated = meter.createCounter('events_created', { description: 'Events created' });
const saves = meter.createCounter('saves', { description: 'Events saved' });
const hides = meter.createCounter('hides', { description: 'Events hidden (Not interested)' });

// Start every series at 0, so the dashboard's increase() also counts the first event after a restart.
const refusals = ['EVENT_FULL', 'ALREADY_REGISTERED', 'EVENT_STARTED', 'EVENT_CANCELLED'] as const;
for (const result of ['confirmed', ...refusals])
  registrations.add(0, { result: result.toLowerCase() });
cancellations.add(0);
eventsCreated.add(0);
saves.add(0);
hides.add(0);

/** Business counters for the Grafana dashboard. HTTP RED metrics come from the http instrumentation. */
export const businessMetrics = {
  /** `confirmed`, or the error code that refused the seat, lowercased (`event_full`, …). */
  registration: (result: 'confirmed' | ErrorCode) =>
    registrations.add(1, { result: result.toLowerCase() }),
  cancellation: () => cancellations.add(1),
  eventCreated: () => eventsCreated.add(1),
  save: () => saves.add(1),
  hide: () => hides.add(1),
};
