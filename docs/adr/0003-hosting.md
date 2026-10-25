# 0003. One Replit Autoscale deployment on the free tier

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

Reviewers need a live link. The hard constraint is zero cost: no paid hosting or paid tiers anywhere.

## Decision

Deploy one Replit Autoscale app on the free Starter plan, with Replit's built-in Postgres (Neon-backed). The Fastify process serves both the REST API and the built web app from the same origin.

| Property | Consequence | How we handle it |
|---|---|---|
| Scales to zero when idle | First request after idle has a cold start | Accepted for a demo; health endpoints make readiness visible |
| Published link expires after 30 days | Link must be renewed | Redeploy renews it; noted in the README |
| One environment | No staging | CI on every pull request plus local Docker Postgres |
| Instances stop without warning | Buffered telemetry could be lost | Shutdown handler flushes telemetry on SIGTERM |
| Same origin for API and SPA | No CORS configuration; cookies just work | One URL to share |
| Ephemeral, rarely used demo database | Data can go stale | Seed uses relative dates; re-seeds when no upcoming events remain |

**Fallback:** if the free tier blocks us, the same code runs on Render's free web service with Neon's free Postgres.

## Alternatives considered

| Option | Why not |
|---|---|
| Vercel or Netlify for the SPA plus a separate API host | Two deployments, CORS and cross-site cookies to manage |
| Fly.io, Railway, Cloud Run | Free allowances changed or need a payment method |
| Kubernetes or Terraform-managed cloud | Large setup cost with no benefit for a demo |

## Consequences

- One artifact to build and deploy; simplest possible operations.
- Not production-grade: no minimum warm instances, no environment separation, no point-in-time recovery guarantees.

**Revisit when** real users arrive: move to a container platform (Cloud Run, ECS or Fly) with minimum instances, separate staging and production, managed Postgres with backups and point-in-time recovery, and the SPA behind a CDN. The target topology is in [ADR 0011](0011-production-topology.md).
