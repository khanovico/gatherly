import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

/** `GET /me/saved`, `PUT|DELETE /events/:id/save`, `PUT /events/:id/hide`. */
const savesRoutes: FastifyPluginAsyncZod = async () => {};

export default savesRoutes;
