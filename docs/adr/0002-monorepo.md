# 0002. pnpm workspace monorepo with a shared contracts package

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

The API and the web app share request and response shapes, error codes, enums and entitlement names. If they live apart, those contracts drift and bugs appear only at runtime. Mobile apps will join later.

## Decision

One repository using pnpm workspaces:

| Package | Contents |
|---|---|
| `apps/api` | Fastify service, database schema and migrations, tests |
| `apps/web` | React single-page app |
| `packages/shared` | Zod schemas, DTO types, error codes, enums, entitlement names |

No Turborepo or Nx: with three packages, build caching does not repay its configuration.

## Alternatives considered

| Option | Why not |
|---|---|
| Separate repositories with a published contracts package | Version bumps and publishing for every contract change; slow feedback |
| Turborepo or Nx from day one | Caching and task graphs solve problems we do not have yet |
| Duplicate types in each app | Guaranteed drift |

## Consequences

- A contract change is one pull request that updates the API and web together, checked by one CI run.
- CI builds and tests everything on every change; acceptable at this size.
- A React Native app joins as `apps/mobile` and imports the same shared package.

**Revisit when** CI time or package count grows enough that remote caching pays off, or separate teams need independent release cycles.
