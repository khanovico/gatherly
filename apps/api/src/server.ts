import { buildApp } from './app';
import { config } from './config';
import { ensurePersonas } from './db/personas';

const app = await buildApp();
await ensurePersonas(app.db);

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

await app.listen({ host: config.HOST, port: config.PORT });
