import { resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { config } from './config';

// Same depth from src/ (tsx) and dist/ (bundle), so both resolve to apps/web/dist.
const webDist = resolve(import.meta.dirname, '../../web/dist');

/** In production the API also serves the built SPA; other GETs fall back to index.html. */
export async function registerWeb(app: FastifyInstance) {
  if (config.NODE_ENV !== 'production') return;
  await app.register(fastifyStatic, {
    root: webDist,
    // One route per built file instead of a catch-all, so unknown /api URLs keep their own 404.
    wildcard: false,
    // Vite fingerprints everything under /assets, so those files never change.
    setHeaders: (res, path) => {
      if (path.includes('/assets/'))
        res.header('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });
  app.setNotFoundHandler((request, reply) =>
    request.method === 'GET' && !request.url.startsWith('/api/')
      ? reply.sendFile('index.html')
      : reply.status(404).send({ message: 'Not found' }),
  );
}
