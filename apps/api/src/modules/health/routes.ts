import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { config } from '../../config';
import { AppError } from '../../lib/errors';

const ok = { response: { 200: z.object({ status: z.literal('ok') }) } };

const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/healthz', { schema: ok }, () => ({ status: 'ok' as const }));

  app.get('/readyz', { schema: ok }, async (request) => {
    try {
      await app.db.execute(sql`select 1`);
    } catch (err) {
      request.log.warn({ err }, 'database ping failed');
      throw new AppError('INTERNAL', 503, 'Database unavailable');
    }
    return { status: 'ok' as const };
  });

  app.get(
    '/version',
    {
      schema: {
        response: {
          200: z.object({
            gitSha: z.string(),
            buildTime: z.string().nullable(),
            uptimeSeconds: z.number(),
          }),
        },
      },
    },
    () => ({
      gitSha: config.GIT_SHA,
      buildTime: config.BUILD_TIME ?? null,
      uptimeSeconds: Math.round(process.uptime()),
    }),
  );
};

export default healthRoutes;
