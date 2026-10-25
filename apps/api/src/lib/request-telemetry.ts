import { trace } from '@opentelemetry/api';
import type { FastifyInstance } from 'fastify';

/** The active OpenTelemetry trace id, or undefined when telemetry is off. */
export const currentTraceId = () => trace.getActiveSpan()?.spanContext().traceId;

/**
 * One log line per request, keyed by the route template. Replaces Fastify's request logging,
 * which logs the raw URL (search text) and the client IP.
 */
export const registerRequestLogging = (app: FastifyInstance) => {
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? 'unmatched',
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
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
