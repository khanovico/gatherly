import { z } from 'zod';
import { InteractionType, Surface } from './enums';
import { eventSummary } from './events';
import { locationQuery } from './places';

export const interaction = z.object({
  eventId: z.uuid(),
  type: InteractionType,
  surface: Surface,
  /** 0-based slot in the list or rail. */
  position: z.int().min(0).optional(),
  /** Search text the list was filtered by. */
  query: z.string().max(100).optional(),
  rankerVersion: z.string().max(40).optional(),
  requestId: z.string().max(64).optional(),
});
export type Interaction = z.infer<typeof interaction>;

/** `POST /interactions` → 204. Signed-out clients send a random `anonymousId` kept on the device. */
export const interactionBatch = z.object({
  anonymousId: z.uuid().optional(),
  interactions: z.array(interaction).min(1).max(50),
});
export type InteractionBatch = z.infer<typeof interactionBatch>;

export const DiscoverRail = z.enum(['for_you', 'near_you', 'popular']);
export type DiscoverRail = z.infer<typeof DiscoverRail>;

/** `GET /discover/home`. Signed in, the profile location is used when the query has none. */
export const discoverHomeQuery = locationQuery;
export type DiscoverHomeQuery = z.infer<typeof discoverHomeQuery>;

/** Non-empty rails in display order. Signed out: `popular`, plus `near_you` with a location. */
export const discoverHome = z.object({
  rankerVersion: z.string(),
  requestId: z.string(),
  rails: z.array(z.object({ id: DiscoverRail, title: z.string(), events: z.array(eventSummary) })),
});
export type DiscoverHome = z.infer<typeof discoverHome>;
