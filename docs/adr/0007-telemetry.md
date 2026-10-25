# 0007. OpenTelemetry direct to Grafana Cloud, errors to Sentry

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

We want production-grade visibility from day one: one trace from a click in the browser down to the SQL query, logs correlated to that trace, business metrics, and actionable errors. Constraints: free tiers only, and the host cannot run a sidecar or a separate collector process.

## Decision

| Signal | Path |
|---|---|
| Traces, metrics, logs (API) | OpenTelemetry Node SDK with automatic instrumentation (HTTP, Fastify, Postgres), exported over OTLP/HTTP straight to the Grafana Cloud OTLP gateway |
| Errors (API) | Sentry Node, reusing our OpenTelemetry setup rather than its own |
| Errors, traces, web vitals (web) | Sentry React; the browser sends `traceparent` so web and API spans form one trace |

Sampling is 100 percent. On SIGTERM the process flushes OpenTelemetry and Sentry before exit, which matters because Autoscale stops idle instances. Details in [observability](../observability.md).

## Alternatives considered

| Option | Why not now |
|---|---|
| OpenTelemetry Collector between app and backend | Best practice at scale (tail sampling, batching, routing), but nowhere to run it on free Autoscale |
| Sentry only | Strong for errors; weak for logs and custom business metrics |
| Vendor agent (Datadog, New Relic) | Paid; proprietary instrumentation |
| Console logs only | No traces, no correlation, no metrics |

## Consequences

- Backends are swappable by configuration because instrumentation is OpenTelemetry standard.
- No tail sampling: we keep every trace, which is fine at demo volume.
- Export work runs inside the API process; small overhead accepted.
- Free-tier series limits make metric label cardinality a design rule: route templates, never user or event IDs.

**Revisit when** traffic or cost grows: add a collector with tail sampling (keep errors and slow traces, sample the rest), define SLOs with alerts, and add real user monitoring.
