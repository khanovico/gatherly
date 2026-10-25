# Gatherly Demo Guide

How to try the live demo or a local copy: the personas, a five-minute tour, screenshots, and how the code is laid out. The [README](../README.md) has the short version.

**Live demo: [gatherly--khanovicdev.replit.app](https://gatherly--khanovicdev.replit.app)** (free hosting; the first request after a quiet period takes a few seconds while the app wakes up).

## Two ways in

- **Create an account** with email and password. A three-step onboarding asks what you are into, where you are in New York and when you are free; Discover then opens on **For you**.
- **Try a demo account**, no password: three personas on the sign-in page, switchable at any time from the avatar menu. Demo sign-in exists only when the server runs with `DEMO_MODE=true` (the hosted demo and `docker compose up` both do).

The demo holds about 200 members and 40 events across New York neighborhoods, with real registrations, saves and interaction history.

| Persona | Role and plan | What to try |
|---|---|---|
| **Olivia Bennett** (Organizer) | Member, Premium plan | Create an event and watch the live preview; edit capacity; open an event's attendee list and remove someone |
| **Alex Morgan** (Attendee) | Member, Free plan, onboarded | **For you** with reasons on every card; save an event, or mark one **Not interested**; reserve and cancel a seat; try **Host an event** to hit the Premium paywall |
| **Sam Patel** (Admin) | Administrator | Review platform stats; suspend a demo member or grant Premium; cancel any event; reset the demo data |

## Five-minute tour

1. **Create an account** and finish onboarding (pick three interests, a neighborhood, your free times). Discover opens on **For you**: each card says why it is there ("Because you like Tech", "1.8 km away", "Tuesday evening").
2. Search with a typo, such as `kayakng`; filter by distance or date; scroll to the end of the list.
3. Sign in as **Alex**, open any event and reserve a seat. The seat meter updates; the ticket appears under **My tickets**.
4. Cancel the reservation; the seat returns to the pool. Save an event with the heart, or hide one from the card menu.
5. Try **Host an event**. Alex is on the Free plan, so a paywall offers Premium (checkout answers "coming soon"; no real payments).
6. Switch to **Olivia**, create an event with a capacity of 2, then switch personas to fill it. The third attempt shows **Sold out**; the API refuses it with `EVENT_FULL`.
7. Switch to **Sam**. Suspend a background member, change a plan, or cancel an event (its registrations are cancelled with it). The personas themselves are protected so a public visitor cannot lock others out, and real accounts created on the demo are read-only to admins, with their emails masked. **Reset demo data** reseeds: it removes events hosted by demo accounts and the seeded members, and keeps real accounts (minus their activity on those demo events).

The seed uses dates relative to today, and in demo mode the server re-seeds on start when no upcoming events remain, so the demo stays fresh.

## Observability in two minutes

Sign in as Sam, open **Admin**, then **Observability**, and press **Trigger test error**. Copy the trace ID and find it in the [public Grafana dashboard](https://lankyholly1972.grafana.net/public-dashboards/9402737b590a4f538536e6057470aeba) under **Recent API requests**; the [shared Sentry issues](https://khandev-s1.sentry.io/share/issue/25e21197641d4401a8ebfddb8027efa0/) count one more event. Details and privacy guardrails: [observability](observability.md#see-it-live-no-account-needed).

## Screenshots

| | |
|---|---|
| ![Sign-in and sign-up](images/signin.png) **Sign in:** email and password, or a demo account in one click | ![Onboarding](images/onboarding.png) **Onboarding:** interests and tags, then location and schedule |
| ![For you feed](images/for-you.png) **For you:** ranked by interests, distance and schedule, with reasons | ![Search with a typo](images/search.png) **Search:** full-text with typo tolerance ("sourdugh") |
| ![Landing page](images/landing.png) **Landing:** personal rails for signed-in members | ![Event detail](images/event-detail.png) **Event detail:** seats meter and one-click reservation |
| ![Organizer dashboard](images/organizer-dashboard.png) **Organizer dashboard:** fill rates and event management | ![Create event](images/create-event.png) **Create event:** validated form with live preview |
| ![Premium paywall](images/paywall.png) **Paywall:** a Free member trying to create an event | ![Admin console](images/admin.png) **Admin console:** platform stats, users, events, demo reset |
| ![Sentry trace](images/sentry-trace.png) **Sentry:** browser pageload and the failing API call share one trace | ![Grafana trace](images/grafana-trace.png) **Grafana Tempo:** the same trace ID with API and database spans |

## Repository map

| Path | What lives there |
|---|---|
| `apps/api` | Fastify REST API under `/api/v1`. `src/modules/*` holds one folder per area (auth, profile, events, discover, saves, interactions, registrations, organizer, admin, billing, health); `src/ranking` the ranker; `src/lib` guards, errors, rate limits and metrics; `src/db` the Drizzle schema and demo seed; `src/migrate.ts` the migration runner; `drizzle/` SQL migrations; `test/` integration tests against Postgres |
| `apps/web` | React single-page app (Vite, TanStack Query, React Router, Tailwind, shadcn/ui). `src/pages` has one file per route, `src/features` the page-specific components |
| `packages/shared` | Zod schemas, types, enums and error codes shared by API and web, so contracts cannot drift |
| `ops/grafana` | Grafana dashboard for request rate, errors, latency and business counters |
| `docs` | Architecture, API, monetization, observability, roadmap and decision records |
| `.github/workflows` | CI: lint, type check, tests against Postgres, build |
| `.replit` | Build and run configuration for the hosted demo |

## Development commands

| Task | Command | Notes |
|---|---|---|
| Tests | `pnpm test` | Runs against the `gatherly_test` database the Compose file creates |
| Lint, format, types | `pnpm lint` and `pnpm typecheck` | Same checks as CI |
| Production build | `pnpm build` | API bundle plus the web app; the API serves the web app when `NODE_ENV=production` |

Telemetry is off unless its variables are set; `.env.example` lists them.

## Free hosting effects

| Effect | What it means for the demo |
|---|---|
| Scales to zero when idle | The first request after a quiet period has a cold start of a few seconds |
| Published link expires after 30 days | Renewed by republishing; the relative-date seed keeps content current |
| "Made with Replit" badge | Shown in the corner of the live site; part of the free plan |
| Small instances | Fine for a demo; capacity safety comes from the database, not the instance count |
