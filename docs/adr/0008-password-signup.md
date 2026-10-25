# 0008. Email and password sign-up now, OAuth later

- **Status:** Accepted (amends [0004](0004-demo-auth.md): demo personas stay as "Try a demo account")
- **Date:** 2026-10-25

## Context

Personalization needs real accounts: a person signs up, states what they like, and comes back to a Discover page that remembers them. Demo personas cannot do that. The hard constraints still hold: zero cost, no paid developer programs, and a live URL that can change when the free deployment is renewed.

## Decision

| Choice | Detail | Why |
|---|---|---|
| Email and password | Sign-up and sign-in forms; new users are members on the Free plan and go straight to onboarding | Works today with no third party, no app registration, no redirect URIs |
| Password hashing | argon2id | Memory-hard, the current OWASP recommendation; slows offline cracking if the table leaks |
| Password rule | At least 8 characters, no composition rules | Length beats complexity rules (NIST guidance); fewer frustrated users |
| Sign-in errors | One generic `INVALID_CREDENTIALS` for wrong email or wrong password | Does not reveal which emails have accounts |
| Brute force | Sign-in attempts rate-limited; excess returns 429 `RATE_LIMITED` | Caps password guessing per client and per account |
| Session | The same server-side session and HttpOnly cookie as the demo personas | Guards, routes and the web app do not change |
| OAuth buttons | Google, Apple and Facebook shown, open "coming soon" | Signals the intended path without building it |
| Demo personas | Kept under "Try a demo account" | Reviewers still switch roles in one click |

## Alternatives considered

| Option | Why not now |
|---|---|
| OAuth with Google, Apple, Facebook | Each needs an app registration and fixed redirect URIs; Apple needs a paid developer account; Facebook needs app review; account linking across providers is its own design |
| Hosted identity (Auth0, Clerk, Cognito) | The right production answer from [0004](0004-demo-auth.md), but adds a vendor, a hosted login page and setup that the demo URL churn makes fragile |
| Magic links only | Needs an email provider and deliverability work before anyone can sign in |
| Keep demo personas only | Preferences and history would be shared by every visitor |

## Consequences

- We now store password hashes and own that risk: hashes only, never logged, argon2id parameters reviewed before production.
- Sign-up returns 409 `EMAIL_TAKEN`, which does reveal that an address has an account. Accepted for usability now; once email verification exists, sign-up answers the same way for every address and emails the owner instead.
- No email verification and no password reset yet ("Forgot password?" shows "coming soon"). Unverified emails and no recovery are acceptable for a demo and a blocker for production.
- Password hashing is deliberately slow and CPU-bound; it runs off the main event loop.
- If the rate limiter counts in process memory, each autoscaled instance counts separately; a shared store makes the limit global.

**Revisit when** real users arrive: add OAuth or a hosted identity provider (users keep one account; `password_hash` is nullable so provider-only users have none; accounts link by verified email), email verification, password reset, breached-password screening and MFA for admins.
