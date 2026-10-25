import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createBrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router';

const dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN;

// Errors, page-load and navigation traces, and Web Vitals. Without a DSN the SDK stays off and
// every Sentry call is a no-op. Imported first in main.tsx so it runs before the router exists.
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: 1,
    // API calls carry a W3C `traceparent`, which the API's OpenTelemetry continues: one trace
    // from click to database.
    tracePropagationTargets: [/^\/api\//],
    propagateTraceparent: true,
  });
}

/** `createBrowserRouter` that names transactions after route patterns, e.g. `/events/:id`. */
export const createTracedBrowserRouter = Sentry.wrapCreateBrowserRouterV7(createBrowserRouter);
