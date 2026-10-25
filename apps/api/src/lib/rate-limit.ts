import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errors';

/**
 * Fixed-window limiter kept in memory: one API instance serves the app, so no shared store is needed.
 * Use as a route `onRequest` hook; each call gets its own counters.
 */
export const rateLimit = ({ max, windowMs }: { max: number; windowMs: number }) => {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const now = Date.now();
    let entry = hits.get(request.ip);
    if (!entry || entry.resetAt <= now) {
      // Drop expired windows so the map stays bounded by recent clients.
      for (const [ip, old] of hits) if (old.resetAt <= now) hits.delete(ip);
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(request.ip, entry);
    }
    if (++entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      reply.header('retry-after', retryAfter);
      const minutes = Math.ceil(retryAfter / 60);
      throw new AppError('RATE_LIMITED', 429, `Too many attempts. Try again in ${minutes} min.`);
    }
  };
};
