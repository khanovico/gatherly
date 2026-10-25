# Architecture Decision Records

Short records of the decisions that shape Gatherly. Each one states the context, the decision, the alternatives we rejected, and the price we pay. Status values: Accepted, Superseded.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-stack.md) | TypeScript stack: Fastify, Zod, Drizzle, Postgres, React | Accepted |
| [0002](0002-monorepo.md) | pnpm workspace monorepo with a shared contracts package | Accepted |
| [0003](0003-hosting.md) | One Replit Autoscale deployment on the free tier | Accepted |
| [0004](0004-demo-auth.md) | Demo persona sign-in with server-side sessions | Accepted |
| [0005](0005-authorization-model.md) | Authorization by role, entitlement and ownership | Accepted |
| [0006](0006-capacity-concurrency.md) | Capacity enforced by an atomic conditional update | Accepted |
| [0007](0007-telemetry.md) | OpenTelemetry direct to Grafana Cloud, errors to Sentry | Accepted |
