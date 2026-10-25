import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

// The SPA only loads its own files. Radix and Sonner inject <style> tags at runtime, hence the
// inline styles; the browser Sentry SDK posts to *.sentry.io.
const directives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'", 'https://*.sentry.io'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  // HTTPS is the proxy's job; upgrading would break plain-HTTP local runs.
  upgradeInsecureRequests: null,
};

// Scalar's page boots with an inline script and loads its mono font from fonts.scalar.com.
const docsDirectives = {
  ...directives,
  scriptSrc: ["'self'", "'unsafe-inline'"],
  fontSrc: ["'self'", 'data:', 'https://fonts.scalar.com'],
};

/**
 * Helmet defaults (nosniff, HSTS, COOP/CORP, …) plus a CSP for the SPA, `frame-ancestors 'none'`
 * and no referrer. Register before the routes: /api/docs gets its own CSP when its routes are added.
 */
export async function registerSecurityHeaders(app: FastifyInstance) {
  // Added before helmet so that helmet's own onRoute hook picks up the per-route options.
  app.addHook('onRoute', (route) => {
    if (route.url.startsWith('/api/docs'))
      route.helmet = { contentSecurityPolicy: { useDefaults: false, directives: docsDirectives } };
  });
  await app.register(helmet, {
    contentSecurityPolicy: { useDefaults: false, directives },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
  });
}
