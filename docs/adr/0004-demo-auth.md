# 0004. Demo persona sign-in with server-side sessions

- **Status:** Partly superseded by [0008](0008-password-signup.md). Still in force: server-side sessions, the cookie settings and the protected personas. Replaced: "sign-up coming soon" (real email and password accounts exist) and personas as the only way in (they now exist only when `DEMO_MODE=true`).
- **Date:** 2026-10-25

## Context

Reviewers must be able to try every role (attendee, organizer, admin) in seconds. Building sign-up, passwords, email verification and recovery is undifferentiated work that proves little and adds security risk.

## Decision

- The sign-in page offers "Continue as Organizer / Attendee / Admin". The API creates a server-side session row and sets an HttpOnly, SameSite=Lax cookie, Secure in production.
- A persona switcher in the header changes identity in one click.
- ~~"Sign up" is visible but opens a "coming soon" dialog.~~ Superseded by [0008](0008-password-signup.md).
- Sessions live in Postgres, not in signed tokens.

| Choice | Why | Tradeoff |
|---|---|---|
| Server-side sessions | Revocable instantly (suspend a user, sign out everywhere); no token expiry puzzles | One indexed lookup per request |
| HttpOnly cookie | Not readable by scripts, so an injected script cannot steal it | Native mobile apps need a bearer token instead (see architecture, mobile approach) |
| SameSite=Lax, same origin | Blocks cross-site form posts without CSRF tokens | Revisit if the API is ever called cross-site |
| Personas instead of accounts | Instant role switching for reviewers | Anyone can act as Admin, so seeded personas are protected and the demo can be reset |

## Alternatives considered

| Option | Why not now |
|---|---|
| Email and password | Weeks of security-sensitive work that the brief does not ask for (later adopted in [0008](0008-password-signup.md), when personalization needed real accounts) |
| OIDC provider (Auth0, Clerk, Cognito) | The right production answer, but adds account setup and friction for reviewers |
| JWT in local storage | Not revocable; readable by injected scripts |

## Consequences

The upgrade path is narrow on purpose: an OIDC callback maps the provider identity to a Gatherly user (creating one on first sign-in) and then creates the same session row. Guards, cookies and every route stay unchanged.

**Revisit when** anyone other than reviewers uses the system.
