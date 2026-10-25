import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { config } from './config';
import { createDb, type Db } from './db/client';
import { registerAuth } from './lib/auth';
import { registerApiNotFound, registerErrorHandling } from './lib/errors';
import adminRoutes from './modules/admin/routes';
import authRoutes from './modules/auth/routes';
import billingRoutes from './modules/billing/routes';
import eventsRoutes from './modules/events/routes';
import healthRoutes from './modules/health/routes';
import organizerRoutes from './modules/organizer/routes';
import registrationsRoutes from './modules/registrations/routes';
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
];

/** Pass `db` to share a connection (tests); otherwise the app opens and closes its own pool. */
export async function buildApp(opts: { db?: Db } = {}) {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: { paths: ['email', '*.email'], censor: '[redacted]' },
    },
    trustProxy: true,
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const db = opts.db ?? createDb(config.DATABASE_URL);
  app.decorate('db', db);
  if (!opts.db) app.addHook('onClose', () => db.$client.end());

  registerErrorHandling(app);
  await app.register(
    async (api) => {
      registerApiNotFound(api);
      await registerAuth(api);
      for (const routes of modules) await api.register(routes);
    },
    { prefix: '/api/v1' },
  );
  await registerWeb(app);

  return app.withTypeProvider<ZodTypeProvider>();
}
