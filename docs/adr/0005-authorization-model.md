# 0005. Authorization by role, entitlement and ownership

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

The brief names three user types: organizers, attendees and administrators. But "organizer" is not a fixed identity: in Gatherly, creating events is a Premium plan feature, and anyone can both organize and attend. Billing state will change often (upgrades, failed payments, cancellations).

## Decision

Three independent layers, all enforced in API guards. The UI mirrors them for usability only.

| Layer | Values | Question it answers |
|---|---|---|
| Role | `member`, `admin` | Who are you to the platform? Admin includes every permission. |
| Entitlement | `events:create`, later `tickets:sell` | What does your plan grant? Plans store a list of entitlements. |
| Ownership | event organizer equals current user | Which resources do you control? |

Guards are checked in a fixed order: session, suspension, admin bypass, entitlement, ownership. The persona "Organizer" is a member on the Premium plan; the persona "Attendee" is a member on the Free plan. Admins can grant or revoke a plan, which shows the model end to end without real billing.

## Alternatives considered

| Option | Why not |
|---|---|
| Three fixed roles (organizer, attendee, admin) | Every billing change becomes a role change; a lapsed organizer would lose control of events they already run |
| Checking the plan name in code ("is Premium?") | Repackaging plans would mean code changes everywhere |
| Policy engine (OPA, Cedar, Oso) | Real value at dozens of rules and multiple tenants; overhead for about ten |

## Consequences

- A lapsed Premium organizer keeps ownership (can edit and cancel existing events) but cannot create new ones.
- Adding paid tickets is a new entitlement, not a new role.
- Three checks to reason about per route; documented in the permission matrix in the architecture page.

**Revisit when** teams arrive: introduce organizations that own events, with organization roles (owner, co-organizer, check-in staff). Ownership then means "member of the owning organization with a sufficient role". Consider a policy engine at that point.
