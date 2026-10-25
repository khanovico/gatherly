import { Persona, me, userSummary } from '@gatherly/shared';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PERSONAS } from '../../db/personas';
import { users } from '../../db/schema';
import { SESSION_COOKIE, endSession, startSession, toMe } from '../../lib/auth';
import { AppError } from '../../lib/errors';
import { requireUser } from '../../lib/guards';

const personaCard = z.object({ persona: Persona, user: userSummary });

const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/auth/personas', { schema: { response: { 200: z.array(personaCard) } } }, async () => {
    const emails = Persona.options.map((persona) => PERSONAS[persona].email);
    const rows = await app.db
      .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, email: users.email })
      .from(users)
      .where(inArray(users.email, emails));
    return Persona.options.flatMap((persona) => {
      const row = rows.find((r) => r.email === PERSONAS[persona].email);
      return row
        ? [{ persona, user: { id: row.id, name: row.name, avatarUrl: row.avatarUrl } }]
        : [];
    });
  });

  app.post(
    '/auth/demo-login',
    { schema: { body: z.object({ persona: Persona }), response: { 200: me } } },
    async (request, reply) => {
      const [row] = await app.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, PERSONAS[request.body.persona].email));
      if (!row) throw new AppError('NOT_FOUND', 404, 'Demo persona is not seeded');
      await endSession(app.db, reply, request.cookies[SESSION_COOKIE]);
      request.user = await startSession(app.db, reply, row.id);
      return toMe(app.db, requireUser(request));
    },
  );

  app.post('/auth/logout', async (request, reply) => {
    await endSession(app.db, reply, request.cookies[SESSION_COOKIE]);
    return reply.status(204).send();
  });

  app.get('/me', { schema: { response: { 200: me } } }, (request) =>
    toMe(app.db, requireUser(request)),
  );
};

export default authRoutes;
