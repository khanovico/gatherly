import { registration } from '@gatherly/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../../lib/guards';
import { takeSeat, toRegistration } from './seats';

const eventParams = z.object({ id: z.uuid() });

const registrationsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/events/:id/registrations',
    { schema: { params: eventParams, response: { 201: registration } } },
    async (request, reply) => {
      const user = requireUser(request);
      const row = await takeSeat(app.db, request.params.id, user.id);
      return reply.status(201).send(toRegistration(row));
    },
  );
};

export default registrationsRoutes;
