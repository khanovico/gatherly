# Gatherly

A community events platform: organizers publish meetups, attendees reserve seats, administrators keep the platform healthy. The brief's workflow (create an event with a capacity, register, refuse once full, cancel to free the seat) is race-safe and tested; on top of it, a rule-based **For you** feed ranks events by interests, neighborhood and schedule and says why each one is there.

![Gatherly Discover page with the For you feed](docs/images/for-you.png)

| Live | Link |
|---|---|
| Demo (free hosting, few-second cold start) | [gatherly--khanovicdev.replit.app](https://gatherly--khanovicdev.replit.app): create an account, or try a demo persona |
| API reference | [/api/docs](https://gatherly--khanovicdev.replit.app/api/docs), generated from the schemas that validate requests |
| Telemetry, no account needed | [Grafana dashboard](https://lankyholly1972.grafana.net/public-dashboards/9402737b590a4f538536e6057470aeba) and a shared [Sentry issue](https://khandev-s1.sentry.io/share/issue/25e21197641d4401a8ebfddb8027efa0/) |

Personas, a five-minute tour and screenshots: [docs/demo.md](docs/demo.md).

## Run it

Prerequisite: Docker.

```bash
docker compose up
```

Open [localhost:3000](http://localhost:3000). Migrations and the demo seed run automatically (Compose sets `DEMO_MODE=true`). Set `APP_PORT` or `DB_PORT` if 3000 or 54329 are taken.

For development with hot reload (Node 22.12+, pnpm 9 via `corepack enable`):

```bash
cp .env.example .env && docker compose up -d db && pnpm install && pnpm db:migrate && pnpm dev
```

Open [localhost:5173](http://localhost:5173). Run the tests with `pnpm test`; lint and types with `pnpm lint` and `pnpm typecheck`.

## How the brief is covered

| Brief item | Where |
|---|---|
| Architecture diagram and explanation | [docs/architecture.md](docs/architecture.md), which opens with a one-page map from every brief question to its answer |
| Organizer creates an event with date, time and capacity | `POST /api/v1/events`, gated by the `events:create` entitlement; UTC times plus the event's IANA time zone |
| Attendee registers; no registration once full | `POST /api/v1/events/:id/registrations`: one conditional update in one transaction, `409 EVENT_FULL` ([ADR 0006](docs/adr/0006-capacity-concurrency.md)) |
| Cancel frees the seat | `DELETE /api/v1/events/:id/registrations/me`; re-registering afterwards is allowed |
| Validation and error handling | Shared Zod schemas, database constraints as a backstop, RFC 9457 problem details with stable codes ([docs/api.md](docs/api.md)) |
| Role-based authorization | Designed and implemented: role, entitlement and ownership guards in the API ([permission matrix](docs/architecture.md#permission-matrix)) |
| Automated tests | `apps/api/test`: the brief's workflow through the API, an error-path table, and concurrent registrations for the last seats ending with no overbooking |

## Key decisions

| Decision | Choice | Price we pay | Record |
|---|---|---|---|
| Stack | TypeScript end to end: Fastify, Zod, Drizzle, Postgres, React; one schema package shared by API and clients | Node is weak for CPU-heavy work (we have none) | [0001](docs/adr/0001-stack.md), [0002](docs/adr/0002-monorepo.md) |
| Shape | One deployable unit: the API serves the web app from the same origin | Scales as one unit; split later along module lines | [0003](docs/adr/0003-hosting.md) |
| Capacity | Atomic conditional update plus a partial unique index, in one transaction | One hot row per event caps peak throughput | [0006](docs/adr/0006-capacity-concurrency.md) |
| Authorization | Role (who you are), entitlement (what your plan grants), ownership (what you run) | Three checks to reason about | [0005](docs/adr/0005-authorization-model.md) |
| Sign-in | Email and password (argon2id), server-side sessions in an HttpOnly cookie; demo personas only in demo mode | No email verification or social sign-in yet | [0008](docs/adr/0008-password-signup.md) |
| Telemetry | OpenTelemetry to Grafana Cloud, errors to Sentry, one trace ID end to end | No collector, so no tail sampling | [0007](docs/adr/0007-telemetry.md) |
| Ranking | Rule-based, versioned ranker behind an interface, reasons on every card, every impression logged | Hand-tuned weights until there is data to learn from | [0009](docs/adr/0009-rule-based-ranker.md), [0010](docs/adr/0010-interaction-data.md) |

## Assumptions, limitations and tradeoffs

| Assumption | Effect |
|---|---|
| Organizing is a paid capability (Premium); attending is free | Organizer is a plan entitlement, not an account type; an admin can grant it |
| Events are free for now | Price fields exist; the API rejects a price above zero with `PAID_TICKETS_UNAVAILABLE` |
| Registration closes when the event starts; no waitlist | `EVENT_STARTED` after start; a full event refuses new registrations |
| Events start within two years and last at most seven days | Keeps typos (year 3026, a month-long "meetup") out of discovery |
| Monetization (subscriptions plus a ticketing fee) is a hypothesis | Options and validation steps in [docs/monetization.md](docs/monetization.md) |

| Limitation | Why acceptable now | Upgrade path |
|---|---|---|
| In demo mode anyone can act as Admin | Reviewers need every role instantly; personas are protected, real accounts are read-only and their emails masked, reset removes only demo-hosted events and seeded members | `DEMO_MODE` off in production; admins through an identity provider with MFA |
| No email verification or password reset | Enough for each visitor to keep their own preferences | Hosted identity or OAuth ([ADR 0008](docs/adr/0008-password-signup.md)) |
| Rate limits are counted per instance, in memory | One small instance serves the demo | Shared store (Redis or Postgres) so limits hold across instances |
| **For you** ranks a bounded pool of the soonest matching events | Ranking in memory is simple and explainable at one-city scale | Candidate retrieval in the database (PostGIS, search engine) |
| One environment, no staging; mobile apps are architecture only | Zero-cost hosting; the API is versioned and client-agnostic | Staging and production; native clients on the same API |

| Chose | Over | Because |
|---|---|---|
| Database-enforced capacity | Queues or distributed locks | Correct under concurrency with no extra moving parts |
| Server-side sessions in Postgres | Stateless JWTs | Instant revocation (suspend, sign-out) with no extra store |
| One process serving API and web | Separate frontend hosting | One deployment, same origin, no CORS or cross-site cookies |
| Direct OTLP export | Running a collector | Nothing extra to host; a collector comes with scale |

## Before production

| Area | In place | Before real users |
|---|---|---|
| Identity | argon2id passwords, rate-limited sign-in and sign-up, revocable sessions, suspension | Email verification, password reset, OIDC sign-in, MFA for admins, `DEMO_MODE` off |
| Data | Migrations, check constraints, partial unique index, race-safe capacity | Managed Postgres with point-in-time recovery and a restore drill; migrations as a separate job; zero-downtime migration rules |
| Abuse | Per-IP limits, per-email on sign-in, security headers and CSP, body size limits | Shared rate-limit store, bot protection on high-demand events, audit log of admin actions |
| Personal data | Minimal interaction rows, first-party anonymous ID, telemetry keyed by account UUID, never email | Data export and deletion with anonymization, enforced retention job, consent where required |
| Operations | Health, readiness and version endpoints; traces, logs, metrics, errors; CI | Staging, warm instances, SLOs with alerts, rollback runbook ([docs/operations.md](docs/operations.md)) |

The ordered plan with triggers is in [docs/roadmap.md](docs/roadmap.md).

## Documentation

| Document | Covers |
|---|---|
| [Architecture](docs/architecture.md) | Brief at a glance, system context, request flow, data model, access control, scaling, security, integrations, mobile |
| [API](docs/api.md) | Endpoints, access rules and error codes per endpoint |
| [Operations](docs/operations.md) | Environments, backups and RPO/RTO, migrations, flags, on-call; accessibility, i18n, privacy rights, PCI scope, cost; trust and safety |
| [Observability](docs/observability.md) | Signals, trace flow, metrics, dashboard, public links and guardrails |
| [Monetization](docs/monetization.md) | Plans, ticketing marketplace, seat holds, refunds, webhooks, tax |
| [Roadmap](docs/roadmap.md) | Now, next and later |
| [Demo guide](docs/demo.md) | Personas, tour, screenshots, repository map |
| [Decision records](docs/adr/README.md) | Short ADRs for each major choice |
