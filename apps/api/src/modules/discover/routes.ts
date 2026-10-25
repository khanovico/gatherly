import { randomUUID } from 'node:crypto';
import { discoverHome, discoverHomeQuery, type DiscoverRail } from '@gatherly/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { loadCandidates } from '../../ranking/candidates';
import { loadViewer, locate, toSummary } from '../../ranking/feed';
import { resolveOrigin } from '../../ranking/geo';
import type { Ranked } from '../../ranking/ranker';
import { DEFAULT_RADIUS_KM, popularity, ranker, timeOfWeek } from '../../ranking/rule-based';

const RAIL_SIZE = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Weekend events in the coming seven days: the rest of this weekend, else the next one. */
const thisWeekend = (now: Date) => (e: Ranked) =>
  e.startsAt.getTime() - now.getTime() < WEEK_MS &&
  timeOfWeek(e.startsAt, e.timezone).slot === 'weekends';

/** `GET /discover/home`: one ranked pool, cut into rails. */
const discoverRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/discover/home',
    { schema: { querystring: discoverHomeQuery, response: { 200: discoverHome } } },
    async (request) => {
      const now = new Date();
      const viewer = await loadViewer(app.db, request.user);
      const profile = viewer?.profile ?? null;
      const origin = resolveOrigin(request.query, profile);
      const pool = await loadCandidates(app.db, { viewerId: viewer?.id, recommend: true });
      const ranked = ranker.rank(locate(pool, origin), { profile, now });
      const radius = profile?.radiusKm ?? DEFAULT_RADIUS_KM;
      // Without a location nothing has a distance, so the near rail stays empty and is left out.
      const near = ranked.filter((e) => (e.distanceKm ?? Infinity) <= radius);
      const rails: [DiscoverRail, string, Ranked[]][] = [
        ['for_you', 'For you', profile?.onboardedAt ? ranked : []],
        ['near_you', 'Near you this weekend', near.filter(thisWeekend(now))],
        ['popular', 'Popular now', ranked.toSorted((a, b) => popularity(b) - popularity(a))],
      ];
      return {
        rankerVersion: ranker.version,
        requestId: randomUUID(),
        rails: rails
          .filter(([, , events]) => events.length > 0)
          .map(([id, title, events]) => ({
            id,
            title,
            events: events.slice(0, RAIL_SIZE).map((e) => toSummary(viewer, e)),
          })),
      };
    },
  );
};

export default discoverRoutes;
