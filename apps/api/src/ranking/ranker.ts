import type { EventSummary } from '@gatherly/shared';
import type { Candidate } from './candidates';
import type { ViewerProfile } from './geo';

export type Located = Candidate & { distanceKm?: number };
export type Reason = NonNullable<EventSummary['reasons']>[number];
export type Ranked = Located & { score: number; reasons: Reason[] };
export type RankContext = { profile: ViewerProfile | null; now: Date };

/**
 * Orders one viewer's candidates, best first, and explains each. Candidate generation and the
 * API stay the same when a trained model replaces the rules; only `version` changes.
 */
export interface Ranker {
  readonly version: string;
  rank(candidates: Located[], ctx: RankContext): Ranked[];
}
