# Gatherly API

A versioned JSON REST API. The live, always-current contract is the OpenAPI document served at **`/api/docs`**, generated from the same Zod schemas that validate requests, so documentation cannot drift from behavior. This page is the human overview.

## Conventions

| Topic | Rule | Why |
|---|---|---|
| Base path | `/api/v1` | Installed mobile apps update slowly; breaking changes go to `/api/v2` with a deprecation window |
| Format | JSON request and response bodies | One format for web and mobile |
| Authentication | Session cookie (HttpOnly, SameSite=Lax, Secure in production) set by sign-up, sign-in or demo sign-in; bearer tokens for mobile later | Revocable sessions; see [ADR 0008](adr/0008-password-signup.md) |
| Authorization | Role, entitlement and ownership guards on every route | The UI is never the security boundary; see [ADR 0005](adr/0005-authorization-model.md) |
| Errors | RFC 9457 problem details (`application/problem+json`) with fields `type`, `title`, `status`, `detail` and a stable `code` | Clients branch on `code`, never on message text |
| Validation | Zod schema per route; failures return field-level details | Same rules as the web forms, from `packages/shared` |
| Pagination | Every list (events, my registrations, my events, saved events, attendees, admin lists) takes `page` and `pageSize` and returns `items`, `page`, `pageSize`, `total` | Simple, predictable; cursor pagination can come later for feeds |
| Rate limits | Fixed windows per client IP on sign-in, sign-up, demo sign-in and interactions; also per target email on sign-in and per visitor on interactions. The client IP is read through `TRUST_PROXY_HOPS` trusted proxies only, so a forged `X-Forwarded-For` does not get a fresh window; excess returns 429 `RATE_LIMITED` with `Retry-After`. Counted in each instance's memory, so with N instances a client gets up to N times the limit until a shared store replaces it | Cheap brute-force protection on one instance; the upgrade is known |
| Request bodies and methods | JSON only, size-limited; each path answers only its methods | Oversized bodies get 413 `PAYLOAD_TOO_LARGE`, other content types 415 `UNSUPPORTED_MEDIA_TYPE`, a known path called with the wrong method 405 `METHOD_NOT_ALLOWED` with an `Allow` header |
| Time | ISO 8601 in UTC; events also carry an IANA `timezone` | Correct ordering everywhere; local display at the venue |
| Money | Integer minor units (`priceCents`) plus `currency` | No floating-point rounding |
| Tracing | Accepts W3C `traceparent`; with telemetry configured, every `/api` response carries `x-trace-id` | Browser and API spans join one trace; any response can be looked up in Grafana or Sentry |
| Ranked results | Personalized responses carry `rankerVersion` and a request ID; event summaries carry `reasons[]` and, when location is known, `distanceKm` | Clients show why an event is suggested; impressions can be tied to the ranking that produced them |

## Endpoints

Access column: **public** needs nothing; **session** needs any signed-in, non-suspended user; **owner** means the event's organizer; admins pass every check.

### Authentication and profile

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/auth/personas` | public | List demo personas for the sign-in page; empty when demo mode is off | none |
| POST | `/auth/signup` | public | Create an account (email, name, password of at least 8 characters; the `@gatherly.demo` domain is reserved); member on the Free plan; answers 201 and sets the session cookie | `VALIDATION_FAILED`, `EMAIL_TAKEN`, `RATE_LIMITED` |
| POST | `/auth/signin` | public | Sign in with email and password; sets the session cookie | `VALIDATION_FAILED`, `INVALID_CREDENTIALS`, `RATE_LIMITED` |
| POST | `/auth/demo-login` | public, demo mode only | Sign in as a persona; sets the session cookie | `VALIDATION_FAILED`, `RATE_LIMITED`, `NOT_FOUND` (demo mode off, or persona not seeded) |
| POST | `/auth/logout` | public | End the session if there is one; always 204 | none |
| GET | `/me` | session | Current user, role, plan and entitlements (drives the UI) | `UNAUTHENTICATED` |
| GET | `/me/profile` | session | My private preferences: interests, tags, neighborhood, travel radius, formats, time slots, onboarding status | `UNAUTHENTICATED` |
| PUT | `/me/profile` | session | Save preferences (onboarding and settings); at least 3 interests | `VALIDATION_FAILED` |
| GET | `/users/:id` | public | Public profile: name, avatar, bio, interests, events hosting, member since. The attending list is returned only to the profile's owner | `NOT_FOUND` |

### Events

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/events` | public | Upcoming events with search, filters and sort (parameters below); paginated for infinite scroll | `VALIDATION_FAILED` |
| GET | `/events/:id` | public | Event detail with organizer and the viewer's registration, if any | `NOT_FOUND` |
| POST | `/events` | `events:create` entitlement | Create an event (published immediately); answers 201 | `ENTITLEMENT_REQUIRED`, `VALIDATION_FAILED`, `PAID_TICKETS_UNAVAILABLE` |
| PATCH | `/events/:id` | owner or admin | Edit an event before it starts | `VALIDATION_FAILED`, `FORBIDDEN`, `NOT_FOUND`, `CAPACITY_BELOW_REGISTERED`, `EVENT_STARTED`, `EVENT_CANCELLED` |
| POST | `/events/:id/cancel` | owner or admin | Cancel an event before it starts; its active registrations are cancelled in the same transaction (every seat freed) and kept as history | `FORBIDDEN`, `NOT_FOUND`, `EVENT_STARTED`, `EVENT_CANCELLED` |

**Event list parameters**

| Parameter | Meaning |
|---|---|
| `q` | Full-text search, weighted title, then tags, summary, description; tolerates typos |
| `category`, `tags`, `format` | Filter by category, tags, in person or online |
| `near` or `lat` and `lng`, `radiusKm` | A neighborhood ID or coordinates as the origin, and a distance (2, 5, 10 or 25 km). With a radius, online events (no location) are left out |
| `from`, `to` | Date range |
| `freeOnly` | Only free events |
| `sort` | `for_you`, `soonest`, `nearest` or `popular`; without it, `for_you` for onboarded members and `popular` for everyone else. The plain sorts order and page in SQL, so `total` is exact; `for_you` ranks a pool of the 500 soonest matches and returns `totalCapped: true` when that pool is full |
| `page`, `pageSize` | Pagination |

### Discovery, saves and interactions

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/discover/home` | public | Home rails in one call: "For you", "Near you this weekend", "Popular now"; anonymous visitors get popular and, if location is shared, nearby | `VALIDATION_FAILED` |
| PUT | `/events/:id/save` | session | Save an event (idempotent) | `NOT_FOUND` |
| DELETE | `/events/:id/save` | session | Remove a save (idempotent; always 204) | none |
| GET | `/me/saved` | session | My saved events, paginated | none |
| PUT | `/events/:id/hide` | session | "Not interested": the event never appears in my rankings again (idempotent) | `NOT_FOUND` |
| POST | `/interactions` | public (anonymous ID) or session | Record a batch of interactions (impression, click, view, save, unsave, hide, register, cancel) with surface, position, query, ranker version and request ID; see [ADR 0010](adr/0010-interaction-data.md) | `VALIDATION_FAILED`, `RATE_LIMITED` |

### Registrations

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| POST | `/events/:id/registrations` | session | Register; race-safe capacity check ([ADR 0006](adr/0006-capacity-concurrency.md)) | `EVENT_FULL`, `ALREADY_REGISTERED`, `EVENT_STARTED`, `EVENT_CANCELLED`, `NOT_FOUND`, `EVENT_BUSY` |
| DELETE | `/events/:id/registrations/me` | session | Cancel my registration; frees the seat | `NOT_REGISTERED`, `EVENT_STARTED`, `EVENT_BUSY` |
| GET | `/me/registrations` | session | My registrations with event summaries: `when=upcoming` (soonest first) or `past` (most recent first), paginated, with counts for both tabs | `VALIDATION_FAILED` |

### Organizer

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/me/events` | session | Events I organize: `when=upcoming`, `past` or `cancelled`, paginated, with dashboard stats (tab sizes, registrations, mean fill rate) | `VALIDATION_FAILED` |
| GET | `/events/:id/registrations` | owner or admin | Attendee list, oldest first, paginated, searchable with `q`; in demo mode, real accounts' emails are masked and not searchable | `FORBIDDEN`, `NOT_FOUND` |
| POST | `/registrations/:id/cancel` | owner or admin | Remove an attendee; frees the seat | `FORBIDDEN`, `NOT_FOUND`, `NOT_REGISTERED` (already cancelled), `EVENT_BUSY` |

### Administration

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/admin/stats` | admin | Platform totals for the admin dashboard | `FORBIDDEN` |
| GET | `/admin/users` | admin | Users, paginated and searchable; in demo mode, real accounts' emails are masked (`j***@example.com`) and not searchable | `FORBIDDEN` |
| PATCH | `/admin/users/:id` | admin | Change status (suspend), role or plan | `FORBIDDEN` (last active admin, or a real account in demo mode), `PROTECTED_DEMO_ACCOUNT`, `NOT_FOUND` |
| GET | `/admin/events` | admin | All events, including cancelled | `FORBIDDEN` |
| GET | `/admin/integrity/seats` | admin | Events whose `registeredCount` differs from their active registration rows; expected `{ "drift": [] }`, since a database trigger keeps them equal ([ADR 0006](adr/0006-capacity-concurrency.md)) | `FORBIDDEN` |
| POST | `/admin/demo/reset` | admin, demo mode only | Delete events hosted by demo accounts and the non-persona `@gatherly.demo` members, reset the personas, reseed. Real accounts stay; their activity on demo events goes with those events, and the seats the deleted members held are released by the trigger | `FORBIDDEN`, `NOT_FOUND` (demo mode off) |
| POST | `/admin/diagnostics/error` | admin | Send a test error to Sentry; answers 500 with `traceId` and `sentryEventId`. One per 10 seconds | `RATE_LIMITED`, `FORBIDDEN` |

### Billing

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/billing/plans` | public | Plans with prices and entitlements | none |
| GET | `/billing/subscription` | session | My current plan | none |
| POST | `/billing/checkout` | session | Start an upgrade; returns `COMING_SOON` through a mock payment provider ([monetization](monetization.md)) | `COMING_SOON` |

### Operations

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/healthz` | public | Liveness: the process is up |
| GET | `/readyz` | public | Readiness: the database answers; 503 when it does not |
| GET | `/version` | public | Git SHA, build time and uptime |

## Error codes

Every error response carries one of these stable codes. Clients and tests branch on the code; messages may change.

| Code | HTTP status | When | What the client should do |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | Request body or query fails its schema (bad shape, missing field, out of range) | Show field errors from the response |
| `UNAUTHENTICATED` | 401 | No valid session | Send the user to sign in |
| `INVALID_CREDENTIALS` | 401 | Email or password is wrong (deliberately not saying which) | Show one generic message; offer sign-up |
| `FORBIDDEN` | 403 | Signed in, but not the owner or not an admin; or an admin action the platform refuses (demoting the last admin, changing a real account from the demo admin) | Hide the action; explain access |
| `ENTITLEMENT_REQUIRED` | 403 | Plan lacks the needed entitlement (for example `events:create`) | Show the upgrade paywall |
| `ACCOUNT_SUSPENDED` | 403 | User is suspended | Show a suspended notice; allow sign-out only |
| `NOT_FOUND` | 404 | Resource does not exist, or a demo-only route with demo mode off | Show a not-found state |
| `NOT_REGISTERED` | 404 | Cancelling a registration that is not active | Refresh the event state |
| `METHOD_NOT_ALLOWED` | 405 | Known path, wrong method; the `Allow` header lists the right ones | Fix the client call |
| `EVENT_FULL` | 409 | No seats left | Show "sold out"; offer other events |
| `EVENT_BUSY` | 503 | The event row was held by other registrations for longer than `SEAT_LOCK_TIMEOUT_MS` (default 3 s) | Retry after a moment; the seat count has not changed for this caller |
| `EVENT_STARTED` | 409 | Registering, cancelling, editing or cancelling the event after the start time | Show the event as in progress or past |
| `EVENT_CANCELLED` | 409 | Acting on a cancelled event | Show the event as cancelled |
| `ALREADY_REGISTERED` | 409 | An active registration already exists | Show the existing registration |
| `EMAIL_TAKEN` | 409 | Sign-up with an email that already has an account | Offer sign-in instead |
| `CAPACITY_BELOW_REGISTERED` | 409 | Lowering capacity below confirmed registrations | Show the current count as the minimum |
| `PROTECTED_DEMO_ACCOUNT` | 409 | Suspending, demoting or downgrading a seeded persona | Explain the demo guardrail |
| `PAYLOAD_TOO_LARGE` | 413 | Request body above the size limit | Shorten the input |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Request body that is not JSON | Send `application/json` |
| `PAID_TICKETS_UNAVAILABLE` | 422 | Event price above zero in the MVP | Keep the price at zero |
| `RATE_LIMITED` | 429 | Too many requests in a window: sign-in, sign-up, demo sign-in, interactions, or the diagnostics error (one per 10 seconds) | Wait; honor the `Retry-After` header (sent by every limit except the diagnostics error) |
| `INTERNAL` | 500, 503 | Unexpected failure, reported to Sentry with a trace ID; 503 from `/readyz` when the database is down | Show a retry option; quote the trace ID to support |

Time rules (`EVENT_STARTED`) are evaluated on the database clock (`starts_at <= now()`) for every endpoint, so two API instances cannot disagree about whether an event has begun.
| `COMING_SOON` | 501 | Feature designed but not built (checkout) | Show a "coming soon" dialog |

**Status choices.** 400 means the request is malformed; 422 means it is well formed but asks for something the MVP will not do. 409 means the request is valid but conflicts with the current state of a resource (capacity, timing, uniqueness), so retrying unchanged will not help until that state changes. Ownership failures return 403 rather than 404 because events are public anyway; hiding their existence gains nothing. Wrong email and wrong password share one 401 so sign-in does not reveal who has an account; sign-up's 409 `EMAIL_TAKEN` does, a tradeoff accepted until email verification exists ([ADR 0008](adr/0008-password-signup.md)).
