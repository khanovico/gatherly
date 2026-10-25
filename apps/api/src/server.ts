import { buildApp } from './app';
import { config } from './config';
import { ensurePersonas } from './db/personas';
import { seedIfStale } from './db/seed';
import { shutdownTelemetry } from './telemetry';

const app = await buildApp();
if (config.DEMO_MODE) {
  await ensurePersonas(app.db);
  if (await seedIfStale(app.db)) app.log.info('demo data seeded');
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    await app.close();
    await shutdownTelemetry();
    process.exit(0);
  });
}

await app.listen({ host: config.HOST, port: config.PORT });
