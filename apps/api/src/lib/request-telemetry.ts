import { trace } from '@opentelemetry/api';
import * as Sentry from '@sentry/node';
import type { FastifyInstance } from 'fastify';

/** The active OpenTelemetry trace id, or undefined when telemetry is off. */
export const currentTraceId = () => trace.getActiveSpan()?.spanContext().traceId;

/**
 * One log line per request, keyed by the route template. Replaces Fastify's request logging,
 * which logs the raw URL (search text) and the client IP. Signed-in requests carry the user's id
 * (a pseudonymous UUID, never the email) on the log line and on any Sentry error, so a support
 * ticket can be traced from the account to its requests.
 */
export const registerRequestLogging = (app: FastifyInstance) => {
  // The auth hook runs on onRequest, so the user is known by preHandler. Sentry keeps one scope
  // per incoming request.
  app.addHook('preHandler', async (request) => {
    if (request.user) Sentry.setUser({ id: request.user.id });
  });
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? 'unmatched',
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
        userId: request.user?.id,
      },
      'request completed',
    );
  });
};

/** `x-trace-id` on every API response, so any response can be looked up in Grafana or Sentry. */
export const registerTraceIdHeader = (api: FastifyInstance) => {
  api.addHook('onSend', async (_request, reply) => {
    const traceId = currentTraceId();
    if (traceId) reply.header('x-trace-id', traceId);
  });
};
