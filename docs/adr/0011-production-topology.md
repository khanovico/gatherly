# 0011. Production topology: containers on a managed platform, components added by trigger

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

The demo runs as one container on Replit's free tier ([ADR 0003](0003-hosting.md)): no warm instances, no staging, no point-in-time recovery, rate limits per instance. Reviewers and future engineers need to know where the system goes when real users arrive, and why each piece of infrastructure is not built yet.

## Decision

Production runs the **same container image** on a managed container platform (AWS ECS Fargate or Google Cloud Run), behind a CDN, a WAF and a load balancer, with managed Postgres (point-in-time recovery, a read replica when reads dominate), Redis for shared rate limits and caching, a queue with worker containers for side effects, and object storage for images. Infrastructure is Terraform. One image is promoted from dev to staging to production with canary releases and automatic rollback.

Each component is added only when its trigger fires. The trigger table lives in [architecture section 12](../architecture.md#12-production-topology).

## Alternatives considered

| Option | Why not |
|---|---|
| Kubernetes (EKS or GKE) | Cluster operations cost a team's time; a managed container platform covers one API and one worker. Revisit when services and teams multiply. |
| Serverless functions per endpoint | Cold starts on the registration path, connection storms against Postgres, and the API already ships as one container |
| Stay on Replit or another PaaS | No staging, no PITR guarantees, no WAF, limited control of instance counts |
| A dedicated API gateway product | Nothing to route to beyond one API; the load balancer, WAF and in-app middleware cover TLS, auth, limits and errors. Revisit for partner APIs with keys and quotas. |
| Microservices now | One team, one domain, one database; a modular monolith keeps boundaries without network hops |

## Consequences

- The application code does not change between the demo and production; only configuration and surrounding infrastructure do.
- Every "not yet" has a stated trigger, so growth work is planned, not discovered in an incident.
- Moving off Replit needs a migration of data and DNS, and a one-time Terraform setup.

**Revisit when** a second backend service appears, multiple teams deploy independently, or a contractual availability or data residency requirement calls for more than one region.
