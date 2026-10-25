# 0009. Rule-based ranker behind a Ranker interface now, a learned model later

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

Discover should feel personal: "For you" first, with a reason on each card. But a new product has almost no behavior data, so a trained model would have nothing to learn from (cold start). Rankings must also be explainable, testable and free to run.

## Decision

All personalized ordering goes through one `Ranker` interface. The first implementation is a weighted rule set, `rules-v1`.

| Part | Behavior |
|---|---|
| Input | Viewer context (interests, tags, home neighborhood, travel radius, formats, time slots, saves, hides, registrations), a candidate set, and the current time |
| Hard filters | Exclude past, full, cancelled, already registered, own and hidden events |
| Score | Interest match + tag overlap + distance decay inside the travel radius + time-slot fit + popularity (fill rate, saves) + recency |
| Diversity | Rerank so no more than 2 events of one category appear in the top 8 |
| Output | Ordered events, each with `reasons[]` ("Because you like Tech", "2.1 km away", "Friday evening") and `distanceKm` |
| Versioning | Every ranked response carries `rankerVersion` and a request ID; any change to weights or features bumps the version |

Sort options beside "For you": soonest, nearest, popular. "For you" is the default for signed-in, onboarded users.

## Why versioning and offline evaluation matter now

Every impression is logged with its ranker version, position, surface and request ID, and every outcome (click, save, register) is logged against the same event ([0010](0010-interaction-data.md)). That makes rankers comparable before users see them:

| Step | What it gives us |
|---|---|
| Replay logged sessions through a candidate ranker | Offline metrics (NDCG at 8, recall, predicted registration rate) against the version that actually served |
| Compare versions on the same traffic | A weight change is a measured decision, not a guess |
| Ship the winner behind its version | Rollback is switching the version back |

Logged data is biased toward what the old ranker showed (position bias), so offline wins are a filter, not proof; online tests decide. Seeded interactions are synthetic, so offline numbers mean nothing until real traffic exists.

## Alternatives considered

| Option | Why not now |
|---|---|
| Collaborative filtering | Needs dense interaction history; cold start everywhere |
| Embeddings with vector search | Infrastructure and cost before there is enough content or behavior to benefit |
| Third-party recommendation service | Cost, user data leaves the system, vendor lock-in |
| No personalization (popular only) | Misses the product goal; every user sees the same page |

## Consequences

- Rankings are deterministic, explainable and unit-testable; reasons come straight from the strongest scoring features.
- Weights are hand-tuned and subjective until data exists.
- Scoring runs in the API over a bounded candidate set (upcoming events in the city), which is fine at city scale; candidate generation must move to an index (geo, nearest-neighbor) as the catalog grows.

**Revisit when** enough real impressions and registrations exist to train on: fit a learning-to-rank model on the same features, prove it offline against `rules-v1`, then run it online behind the same interface. Roadmap stages are in [roadmap](../roadmap.md).
