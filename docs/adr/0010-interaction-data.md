# 0010. Interaction data collection, privacy, consent and retention

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

Personalization improves only if we know what people saw and what they did next. The same data is personal data, so what we collect, why, and for how long must be decided up front, not after the table is full.

## Decision

**Collect:** one append-only `interactions` table in Postgres.

| Field | Purpose |
|---|---|
| User ID or anonymous ID | Whose activity; anonymous visitors get a random first-party ID, never a fingerprint |
| Event ID | Which event |
| Type | impression, click, view, save, unsave, hide, register, cancel |
| Surface and position | Where the card was (Discover, "For you" rail, search) and in which slot, needed to correct for position bias |
| Query | Search text, to improve search relevance |
| Ranker version and request ID | Ties every outcome to the ranking that produced it ([0009](0009-rule-based-ranker.md)) |
| Created at | Time |

The web app records an impression only when a card is actually on screen and sends impressions in batches to `POST /interactions`, so scrolling does not mean one request per card. Saves, hides, registrations and cancellations are state in their own tables; the interaction row adds the context (surface, position, ranker version) that links the outcome back to the impression.

**Protect:**

| Principle | Rule |
|---|---|
| Purpose limitation | Used only to rank and improve Gatherly's own discovery and search; never sold, never shared with ad networks |
| Data minimization | No email, name or free-form profile text in interaction rows; IDs only |
| First party only | No third-party analytics or ad trackers on the site |
| Location | Opt-in and coarse: a chosen neighborhood, or coordinates the user chose to share once; no background tracking |
| Private by default | Preferences (neighborhood, radius, time slots) are private; the public profile shows only name, avatar, bio, interests and upcoming events |
| Separation from telemetry | Product data lives in Postgres, not in Grafana logs, so it has its own access and retention rules |

**Retain (proposed, to confirm with legal):**

| Data | Retention |
|---|---|
| Raw interactions of signed-in users | 180 days, then rolled up into per-user aggregates (for example category affinity) |
| Anonymous interactions | 30 days |
| Aggregates and preferences | While the account exists |
| On account deletion | Profile, saves, hides and interactions deleted; registrations anonymized so seat counts stay correct |

## Alternatives considered

| Option | Why not |
|---|---|
| Third-party product analytics (Segment, Amplitude, Google Analytics) | Data leaves the system, tracker cookies trigger consent requirements, cost |
| Server request logs only | No impressions or positions, so rankers cannot be evaluated |
| Event streaming (Kafka) now | Infrastructure far beyond current volume |

## Consequences

- Impressions dominate write volume; batching keeps request count low, and the table is indexed only by user and time, and by event.
- No consent banner in the MVP: there are no third-party trackers and the data serves the user's own experience. Before launching in the EU, the anonymous ID and personalization need a notice and choice, plus a "use my activity to personalize" switch, data export and deletion on request, and respect for Global Privacy Control.
- Search queries can contain personal text; they are kept with the short raw-data retention, never in aggregates.

**Revisit when** volume or analysis needs outgrow Postgres: partition by month, export to a warehouse (the data platform stage on the [roadmap](../roadmap.md)), and version the event schema.
