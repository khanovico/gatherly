import { buildApp } from './app';
import { config } from './config';

const app = await buildApp();

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

await app.listen({ host: config.HOST, port: config.PORT });
