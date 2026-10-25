import Fastify, { LogController, type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { config } from './config';
import { createDb, type Db } from './db/client';
import { registerAuth } from './lib/auth';
import { registerApiNotFound, registerErrorHandling } from './lib/errors';
import { registerRequestLogging, registerTraceIdHeader } from './lib/request-telemetry';
import adminRoutes from './modules/admin/routes';
import authRoutes from './modules/auth/routes';
import billingRoutes from './modules/billing/routes';
import discoverRoutes from './modules/discover/routes';
import eventsRoutes from './modules/events/routes';
import healthRoutes from './modules/health/routes';
import interactionsRoutes from './modules/interactions/routes';
import organizerRoutes from './modules/organizer/routes';
import profileRoutes from './modules/profile/routes';
import registrationsRoutes from './modules/registrations/routes';
import savesRoutes from './modules/saves/routes';
import { registerOpenApi } from './openapi';
import { registerSecurityHeaders } from './security-headers';
import { registerWeb } from './web';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

const modules = [
  healthRoutes,
  authRoutes,
  eventsRoutes,
  registrationsRoutes,
  organizerRoutes,
  adminRoutes,
  billingRoutes,
  profileRoutes,
  savesRoutes,
  interactionsRoutes,
  discoverRoutes,
];

/**
 * The hop count describes the hosting, which can change under us. A chain shorter than the count
 * means a client could prepend entries and choose its own IP: warn once so the logs show it.
 * Longer chains are normal (clients may send their own header) and only cost precision.
 */
const warnOnProxyMismatch = (app: FastifyInstance) => {
  if (config.TRUST_PROXY_HOPS === 0) return;
  let warned = false;
  app.addHook('onRequest', async (request) => {
    // No header at all: a direct call (health probe), not a request that came through the proxies.
    const forwarded = request.headers['x-forwarded-for'];
    if (warned || !forwarded) return;
    const entries = String(forwarded).split(',').length;
    if (entries >= config.TRUST_PROXY_HOPS) return;
    warned = true;
    request.log.warn(
      { entries, hops: config.TRUST_PROXY_HOPS },
      'X-Forwarded-For is shorter than TRUST_PROXY_HOPS: lower it, or clients can pick their IP',
    );
  });
};

/** Pass `db` to share a connection (tests); otherwise the app opens and closes its own pool. */
export async function buildApp(opts: { db?: Db } = {}) {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: { paths: ['email', '*.email'], censor: '[redacted]' },
    },
    // Request lines come from registerRequestLogging instead.
    logController: new LogController({ disableRequestLogging: true }),
    // Trust only the last TRUST_PROXY_HOPS X-Forwarded-For entries: the ones our own proxies appended.
    trustProxy: (_address, hop) => hop < config.TRUST_PROXY_HOPS,
  });
  warnOnProxyMismatch(app);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const db = opts.db ?? createDb(config.DATABASE_URL);
  app.decorate('db', db);
  if (!opts.db) app.addHook('onClose', () => db.$client.end());

  registerErrorHandling(app);
  registerRequestLogging(app);
  await registerSecurityHeaders(app);
  await registerOpenApi(app);
  await app.register(
    async (api) => {
      registerTraceIdHeader(api);
      registerApiNotFound(api);
      await registerAuth(api);
      for (const routes of modules) await api.register(routes);
    },
    { prefix: '/api/v1' },
  );
  await registerWeb(app);

  return app.withTypeProvider<ZodTypeProvider>();
}
