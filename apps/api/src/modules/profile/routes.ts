import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

/** `GET|PUT /me/profile`, `GET /users/:id`. */
const profileRoutes: FastifyPluginAsyncZod = async () => {};

export default profileRoutes;
