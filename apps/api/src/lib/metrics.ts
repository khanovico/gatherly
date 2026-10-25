import type { ErrorCode } from '@gatherly/shared';
import { metrics } from '@opentelemetry/api';

// telemetry.ts registers the meter provider before the app loads; without it these are no-ops.
// Grafana stores counters with a `_total` suffix, e.g. `registrations_total{result}`.
const meter = metrics.getMeter('gatherly-api');
const registrations = meter.createCounter('registrations', {
  description: 'Registration attempts by result',
});
const cancellations = meter.createCounter('cancellations', {
  description: 'Registrations cancelled',
});
const eventsCreated = meter.createCounter('events_created', { description: 'Events created' });

/** Business counters for the Grafana dashboard. HTTP RED metrics come from the http instrumentation. */
export const businessMetrics = {
  /** `confirmed`, or the error code that refused the seat (`EVENT_FULL`, `ALREADY_REGISTERED`, …). */
  registration: (result: 'confirmed' | ErrorCode) => registrations.add(1, { result }),
  cancellation: () => cancellations.add(1),
  eventCreated: () => eventsCreated.add(1),
};
