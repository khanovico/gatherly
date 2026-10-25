import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errors';

type Options = {
  max: number;
  windowMs: number;
  /** What to count: the client IP by default. `undefined` skips the check. */
  key?: (request: FastifyRequest) => string | undefined;
};

/**
 * Fixed-window limiter kept in this process's memory, so each API instance counts on its own and
 * a restart clears it. The demo runs one instance; more instances need a shared store (roadmap).
 * Each call gets its own counters. Key on the IP as an `onRequest` hook; key on the body (it is
 * parsed and validated by then) as a `preHandler` hook. `request.ip` is only as good as the
 * `TRUST_PROXY_HOPS` setting.
 */
export const rateLimit = ({ max, windowMs, key = (request) => request.ip }: Options) => {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const id = key(request);
    if (id === undefined) return;
    const now = Date.now();
    let entry = hits.get(id);
    if (!entry || entry.resetAt <= now) {
      // Drop expired windows so the map stays bounded by recent clients.
      for (const [old, value] of hits) if (value.resetAt <= now) hits.delete(old);
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    if (++entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      reply.header('retry-after', retryAfter);
      const minutes = Math.ceil(retryAfter / 60);
      throw new AppError('RATE_LIMITED', 429, `Too many attempts. Try again in ${minutes} min.`);
    }
  };
};
