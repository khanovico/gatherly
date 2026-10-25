# Gatherly API

A versioned JSON REST API. The live, always-current contract is the OpenAPI document served at **`/api/docs`**, generated from the same Zod schemas that validate requests, so documentation cannot drift from behavior. This page is the human overview.

## Conventions

| Topic | Rule | Why |
|---|---|---|
| Base path | `/api/v1` | Installed mobile apps update slowly; breaking changes go to `/api/v2` with a deprecation window |
| Format | JSON request and response bodies | One format for web and mobile |
| Authentication | Session cookie (HttpOnly, Secure, SameSite=Lax) set by sign-up, sign-in or demo sign-in; bearer tokens for mobile later | Revocable sessions; see [ADR 0004](adr/0004-demo-auth.md) and [ADR 0008](adr/0008-password-signup.md) |
| Authorization | Role, entitlement and ownership guards on every route | The UI is never the security boundary; see [ADR 0005](adr/0005-authorization-model.md) |
| Errors | RFC 9457 problem details (`application/problem+json`) with fields `type`, `title`, `status`, `detail` and a stable `code` | Clients branch on `code`, never on message text |
| Validation | Zod schema per route; failures return field-level details | Same rules as the web forms, from `packages/shared` |
| Pagination | `page` and `pageSize` query parameters; responses return `items`, `page`, `pageSize`, `total` | Simple, predictable; cursor pagination can come later for feeds |
| Time | ISO 8601 in UTC; events also carry an IANA `timezone` | Correct ordering everywhere; local display at the venue |
| Money | Integer minor units (`priceCents`) plus `currency` | No floating-point rounding |
| Tracing | Accepts W3C `traceparent`; every response carries `x-trace-id` | Browser and API spans join one trace; any response can be looked up in Grafana or Sentry |
| Ranked results | Personalized responses carry `rankerVersion` and a request ID; event summaries carry `reasons[]` and, when location is known, `distanceKm` | Clients show why an event is suggested; impressions can be tied to the ranking that produced them |

## Endpoints

Access column: **public** needs nothing; **session** needs any signed-in, non-suspended user; **owner** means the event's organizer; admins pass every check.

### Authentication and profile

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/auth/personas` | public | List demo personas for the sign-in page | none |
| POST | `/auth/signup` | public | Create an account (email, name, password of at least 8 characters); member on the Free plan; sets the session cookie | `VALIDATION_FAILED`, `EMAIL_TAKEN` |
| POST | `/auth/signin` | public | Sign in with email and password; sets the session cookie | `INVALID_CREDENTIALS`, `RATE_LIMITED` |
| POST | `/auth/demo-login` | public | Sign in as a persona; sets the session cookie | `VALIDATION_FAILED` |
| POST | `/auth/logout` | session | End the session | none |
| GET | `/me` | session | Current user, role, plan and entitlements (drives the UI) | `UNAUTHENTICATED` |
| GET | `/me/profile` | session | My private preferences: interests, tags, neighborhood, travel radius, formats, time slots, onboarding status | `UNAUTHENTICATED` |
| PUT | `/me/profile` | session | Save preferences (onboarding and settings); at least 3 interests | `VALIDATION_FAILED` |
| GET | `/users/:id` | public | Public profile: name, avatar, bio, interests, events hosting and attending, member since | `NOT_FOUND` |

### Events

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/events` | public | Upcoming events with search, filters and sort (parameters below); paginated for infinite scroll | `VALIDATION_FAILED` |
| GET | `/events/:id` | public | Event detail with organizer and the viewer's registration, if any | `NOT_FOUND` |
| POST | `/events` | `events:create` entitlement | Create an event (published immediately) | `ENTITLEMENT_REQUIRED`, `VALIDATION_FAILED`, `PAID_TICKETS_UNAVAILABLE` |
| PATCH | `/events/:id` | owner or admin | Edit an event | `FORBIDDEN`, `CAPACITY_BELOW_REGISTERED`, `EVENT_CANCELLED` |
| POST | `/events/:id/cancel` | owner or admin | Cancel an event; registrations remain for history | `FORBIDDEN`, `EVENT_CANCELLED` |

**Event list parameters**

| Parameter | Meaning |
|---|---|
| `q` | Full-text search, weighted title, then tags, summary, description; tolerates typos |
| `category`, `tags`, `format` | Filter by category, tags, in person or online |
| `near`, `radiusKm` | A neighborhood ID or coordinates, and a distance (2, 5, 10 or 25 km); online events are not distance-filtered |
| `from`, `to` | Date range |
| `freeOnly` | Only free events |
| `sort` | `for_you`, `soonest`, `nearest` or `popular`; `for_you` is the default for signed-in, onboarded users |
| `page`, `pageSize` | Pagination |

### Discovery, saves and interactions

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/discover/home` | public | Home rails in one call: "For you", "Near you this weekend", "Popular now"; anonymous visitors get popular and, if location is shared, nearby | `VALIDATION_FAILED` |
| PUT | `/events/:id/save` | session | Save an event (idempotent) | `NOT_FOUND` |
| DELETE | `/events/:id/save` | session | Remove a save (idempotent) | `NOT_FOUND` |
| GET | `/me/saved` | session | My saved events | none |
| PUT | `/events/:id/hide` | session | "Not interested": the event never appears in my rankings again (idempotent) | `NOT_FOUND` |
| POST | `/interactions` | public (anonymous ID) or session | Record a batch of interactions (impression, click, view, save, unsave, hide, register, cancel) with surface, position, query, ranker version and request ID; see [ADR 0010](adr/0010-interaction-data.md) | `VALIDATION_FAILED` |

### Registrations

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| POST | `/events/:id/registrations` | session | Register; race-safe capacity check ([ADR 0006](adr/0006-capacity-concurrency.md)) | `EVENT_FULL`, `ALREADY_REGISTERED`, `EVENT_STARTED`, `EVENT_CANCELLED`, `NOT_FOUND` |
| DELETE | `/events/:id/registrations/me` | session | Cancel my registration; frees the seat | `NOT_REGISTERED`, `EVENT_STARTED` |
| GET | `/me/registrations` | session | My upcoming and past registrations with event summaries | none |

### Organizer

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/me/events` | session | Events I organize, with registration counts | none |
| GET | `/events/:id/registrations` | owner or admin | Attendee list | `FORBIDDEN`, `NOT_FOUND` |
| POST | `/registrations/:id/cancel` | owner or admin | Remove an attendee; frees the seat | `FORBIDDEN`, `NOT_FOUND` |

### Administration

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/admin/stats` | admin | Platform totals for the admin dashboard | `FORBIDDEN` |
| GET | `/admin/users` | admin | Users, paginated and searchable | `FORBIDDEN` |
| PATCH | `/admin/users/:id` | admin | Change status (suspend), role or plan | `PROTECTED_DEMO_ACCOUNT`, `NOT_FOUND` |
| GET | `/admin/events` | admin | All events, including cancelled | `FORBIDDEN` |
| POST | `/admin/demo/reset` | admin | Restore the demo seed data | `FORBIDDEN` |
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
| GET | `/readyz` | public | Readiness: the database answers |
| GET | `/version` | public | Git SHA, build time and uptime |

## Error codes

Every error response carries one of these stable codes. Clients and tests branch on the code; messages may change.

| Code | HTTP status | When | What the client should do |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | Request body or query fails its schema (bad shape, missing field, out of range) | Show field errors from the response |
| `UNAUTHENTICATED` | 401 | No valid session | Send the user to sign in |
| `INVALID_CREDENTIALS` | 401 | Email or password is wrong (deliberately not saying which) | Show one generic message; offer sign-up |
| `FORBIDDEN` | 403 | Signed in, but not the owner or not an admin | Hide the action; explain access |
| `ENTITLEMENT_REQUIRED` | 403 | Plan lacks the needed entitlement (for example `events:create`) | Show the upgrade paywall |
| `ACCOUNT_SUSPENDED` | 403 | User is suspended | Show a suspended notice; allow sign-out only |
| `NOT_FOUND` | 404 | Resource does not exist | Show a not-found state |
| `NOT_REGISTERED` | 404 | Cancelling a registration that is not active | Refresh the event state |
| `EVENT_FULL` | 409 | No seats left | Show "sold out"; offer other events |
| `EVENT_STARTED` | 409 | Registering or cancelling after the start time | Show the event as in progress or past |
| `EVENT_CANCELLED` | 409 | Acting on a cancelled event | Show the event as cancelled |
| `ALREADY_REGISTERED` | 409 | An active registration already exists | Show the existing registration |
| `EMAIL_TAKEN` | 409 | Sign-up with an email that already has an account | Offer sign-in instead |
| `CAPACITY_BELOW_REGISTERED` | 409 | Lowering capacity below confirmed registrations | Show the current count as the minimum |
| `PROTECTED_DEMO_ACCOUNT` | 409 | Suspending, demoting or downgrading a seeded persona, or demoting the last admin | Explain the demo guardrail |
| `PAID_TICKETS_UNAVAILABLE` | 422 | Event price above zero in the MVP | Keep the price at zero |
| `RATE_LIMITED` | 429 | Too many sign-in attempts | Wait and retry; honor the `Retry-After` header when present |
| `COMING_SOON` | 501 | Feature designed but not built (checkout) | Show a "coming soon" dialog |
| `RATE_LIMITED` | 429 | Too many attempts in a short window (for example the diagnostics error, one per 10 seconds) | Wait and retry |
| `INTERNAL` | 500 | Unexpected failure; reported to Sentry with a trace ID | Show a retry option; quote the trace ID to support |

**Status choices.** 400 means the request is malformed; 422 means it is well formed but asks for something the MVP will not do. 409 means the request is valid but conflicts with the current state of a resource (capacity, timing, uniqueness), so retrying unchanged will not help until that state changes. Ownership failures return 403 rather than 404 because events are public anyway; hiding their existence gains nothing. Wrong email and wrong password share one 401 so sign-in does not reveal who has an account; sign-up's 409 `EMAIL_TAKEN` does, a tradeoff accepted until email verification exists ([ADR 0008](adr/0008-password-signup.md)).
