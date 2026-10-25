import { register } from 'node:module';
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import * as Sentry from '@sentry/node';
import { config } from './config';

// Loaded with `node --import` so instrumentation is in place before the app imports fastify and pg.
// Without OTEL_EXPORTER_OTLP_ENDPOINT nothing starts and @opentelemetry/api stays a no-op.
const isApi = (url = '') => url.startsWith('/api/');

let sdk: NodeSDK | undefined;
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  // pg is the only instrumented package imported from ESM; the rest load through require().
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url, {
    data: { include: ['pg'] },
  });
  // Exporters (OTLP over HTTP for traces, metrics and logs) are configured from OTEL_* env vars.
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': 'gatherly-api',
      'service.version': config.GIT_SHA,
      'deployment.environment': config.NODE_ENV,
    }),
    // API requests only: static files would add a route (and a set of metric series) per
    // fingerprinted asset, on every deploy.
    instrumentations: [
      new HttpInstrumentation({ ignoreIncomingRequestHook: (req) => !isApi(req.url) }),
      new FastifyOtelInstrumentation({
        registerOnInitialization: true,
        ignorePaths: ({ url }) => !isApi(url),
      }),
      new PgInstrumentation(),
      new PinoInstrumentation(),
    ],
  });
  sdk.start();
}

if (config.SENTRY_DSN_API) {
  Sentry.init({
    dsn: config.SENTRY_DSN_API,
    environment: config.NODE_ENV,
    release: config.GIT_SHA,
    // Errors only: OpenTelemetry owns tracing, Sentry attaches each error to the active OTel span.
    // Sentry's Fastify integration would add a second `opentelemetry` decorator next to @fastify/otel.
    enableRuntimeChannelInjection: false,
    integrations: (defaults) => [
      ...defaults.filter((integration) => integration.name !== 'Fastify'),
      Sentry.openTelemetryIntegration(),
    ],
    // Behind Replit's proxy a request also carries the client IP, the session cookie and the
    // visitor's Replit profile headers. Collect only headers that identify nobody.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        allow: ['accept', 'content-type', 'user-agent', 'traceparent', 'sentry-trace'],
      },
      httpBodies: [],
    },
  });
}

/** Exports buffered spans, metrics, logs and Sentry events. Call before the process exits. */
export const shutdownTelemetry = () => Promise.allSettled([sdk?.shutdown(), Sentry.close(2000)]);
