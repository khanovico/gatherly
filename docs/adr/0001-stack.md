# 0001. TypeScript stack: Fastify, Zod, Drizzle, Postgres, React

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

Gatherly needs a small REST API with real validation, a relational store with strong integrity guarantees, and a web client today, with iOS and Android clients later. One engineer builds the MVP fast; a team must be able to grow it.

## Decision

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript, strict, everywhere | One language across API, web and future React Native apps; types catch contract drift at build time |
| API framework | Fastify | Schema-first routes, plugin encapsulation for modules, built-in request injection for fast integration tests |
| Validation and contracts | Zod (shared package) | One schema gives runtime validation, static types, web form validation and the OpenAPI document |
| Database | Postgres | Transactions, row locks, partial unique indexes and check constraints: exactly what the capacity rule needs |
| Data access | Drizzle ORM | Typed queries that stay close to SQL, so the conditional update and partial index are explicit; plain SQL migrations |
| Web | React, Vite, TanStack Query, React Router, Tailwind, shadcn/ui | Mainstream, fast to build with; TanStack Query gives caching and optimistic updates for register and cancel |
| Tests | Vitest against a real Postgres | Concurrency and constraint behavior cannot be proven against mocks |

## Alternatives considered

| Option | Why not |
|---|---|
| Express | No schema-driven typing or validation out of the box; more glue code |
| NestJS | Heavier ceremony (modules, decorators, DI) than a service of this size needs |
| Prisma | Less direct control over the exact SQL the capacity rule depends on; heavier runtime |
| MongoDB or another document store | Capacity and uniqueness rules want relational constraints and transactions |
| Separate languages for API and web | Duplicated contracts, two toolchains, slower for a small team |

## Consequences

- One `packages/shared` change updates API validation, web forms and types together.
- Node is single-threaded per process; fine for an I/O-bound API with no heavy computation.
- Drizzle is younger than Prisma; we accept a smaller ecosystem for SQL transparency.

**Revisit when** a workload is CPU-heavy (image processing, recommendations): run it as a separate worker, possibly in another language.
