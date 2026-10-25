# Gatherly API

A versioned JSON REST API. The live, always-current contract is the OpenAPI document served at **`/api/docs`**, generated from the same Zod schemas that validate requests, so documentation cannot drift from behavior. This page is the human overview.

## Conventions

| Topic | Rule | Why |
|---|---|---|
| Base path | `/api/v1` | Installed mobile apps update slowly; breaking changes go to `/api/v2` with a deprecation window |
| Format | JSON request and response bodies | One format for web and mobile |
| Authentication | Session cookie (HttpOnly, Secure, SameSite=Lax) set by sign-in; bearer tokens for mobile later | Revocable sessions; see [ADR 0004](adr/0004-demo-auth.md) |
| Authorization | Role, entitlement and ownership guards on every route | The UI is never the security boundary; see [ADR 0005](adr/0005-authorization-model.md) |
| Errors | RFC 9457 problem details (`application/problem+json`) with fields `type`, `title`, `status`, `detail` and a stable `code` | Clients branch on `code`, never on message text |
| Validation | Zod schema per route; failures return field-level details | Same rules as the web forms, from `packages/shared` |
| Pagination | `page` and `pageSize` query parameters; responses return `items`, `page`, `pageSize`, `total` | Simple, predictable; cursor pagination can come later for feeds |
| Time | ISO 8601 in UTC; events also carry an IANA `timezone` | Correct ordering everywhere; local display at the venue |
| Money | Integer minor units (`priceCents`) plus `currency` | No floating-point rounding |
| Tracing | Accepts W3C `traceparent` | Browser and API spans join one trace |

## Endpoints

Access column: **public** needs nothing; **session** needs any signed-in, non-suspended user; **owner** means the event's organizer; admins pass every check.

### Authentication and profile

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/auth/personas` | public | List demo personas for the sign-in page | none |
| POST | `/auth/demo-login` | public | Sign in as a persona; sets the session cookie | `VALIDATION_FAILED` |
| POST | `/auth/logout` | session | End the session | none |
| GET | `/me` | session | Current user, role, plan and entitlements (drives the UI) | `UNAUTHENTICATED` |

### Events

| Method | Path | Access | Purpose | Notable errors |
|---|---|---|---|---|
| GET | `/events` | public | Upcoming events; filter by text, category, date range; paginated | `VALIDATION_FAILED` |
| GET | `/events/:id` | public | Event detail with organizer and the viewer's registration, if any | `NOT_FOUND` |
| POST | `/events` | `events:create` entitlement | Create an event (published immediately) | `ENTITLEMENT_REQUIRED`, `VALIDATION_FAILED`, `PAID_TICKETS_UNAVAILABLE` |
| PATCH | `/events/:id` | owner or admin | Edit an event | `FORBIDDEN`, `CAPACITY_BELOW_REGISTERED`, `EVENT_CANCELLED` |
| POST | `/events/:id/cancel` | owner or admin | Cancel an event; registrations remain for history | `FORBIDDEN`, `EVENT_CANCELLED` |

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
| GET | `/version` | public | Git SHA and build time |

## Error codes

Every error response carries one of these stable codes. Clients and tests branch on the code; messages may change.

| Code | HTTP status | When | What the client should do |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | Request body or query fails its schema (bad shape, missing field, out of range) | Show field errors from the response |
| `UNAUTHENTICATED` | 401 | No valid session | Send the user to sign in |
| `FORBIDDEN` | 403 | Signed in, but not the owner or not an admin | Hide the action; explain access |
| `ENTITLEMENT_REQUIRED` | 403 | Plan lacks the needed entitlement (for example `events:create`) | Show the upgrade paywall |
| `ACCOUNT_SUSPENDED` | 403 | User is suspended | Show a suspended notice; allow sign-out only |
| `NOT_FOUND` | 404 | Resource does not exist | Show a not-found state |
| `NOT_REGISTERED` | 404 | Cancelling a registration that is not active | Refresh the event state |
| `EVENT_FULL` | 409 | No seats left | Show "sold out"; offer other events |
| `EVENT_STARTED` | 409 | Registering or cancelling after the start time | Show the event as in progress or past |
| `EVENT_CANCELLED` | 409 | Acting on a cancelled event | Show the event as cancelled |
| `ALREADY_REGISTERED` | 409 | An active registration already exists | Show the existing registration |
| `CAPACITY_BELOW_REGISTERED` | 409 | Lowering capacity below confirmed registrations | Show the current count as the minimum |
| `PROTECTED_DEMO_ACCOUNT` | 409 | Suspending, demoting or downgrading a seeded persona, or demoting the last admin | Explain the demo guardrail |
| `PAID_TICKETS_UNAVAILABLE` | 422 | Event price above zero in the MVP | Keep the price at zero |
| `COMING_SOON` | 501 | Feature designed but not built (checkout) | Show a "coming soon" dialog |
| `INTERNAL` | 500 | Unexpected failure; reported to Sentry with a trace ID | Show a retry option; quote the trace ID to support |

**Status choices.** 400 means the request is malformed; 422 means it is well formed but asks for something the MVP will not do. 409 means the request is valid but conflicts with the current state of a resource (capacity, timing, uniqueness), so retrying unchanged will not help until that state changes. Ownership failures return 403 rather than 404 because events are public anyway; hiding their existence gains nothing.
