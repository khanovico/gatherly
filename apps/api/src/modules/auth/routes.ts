import { hash, verify } from '@node-rs/argon2';
import { Persona, me, signinInput, signupInput, userSummary } from '@gatherly/shared';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { config } from '../../config';
import { PERSONAS } from '../../db/personas';
import { users } from '../../db/schema';
import { SESSION_COOKIE, endSession, startSession, toMe } from '../../lib/auth';
import { isDemoEmail } from '../../lib/demo';
import { AppError } from '../../lib/errors';
import { requireUser } from '../../lib/guards';
import { rateLimit } from '../../lib/rate-limit';

const personaCard = z.object({ persona: Persona, user: userSummary });

const MINUTE_MS = 60 * 1000;
const bodyEmail = (request: FastifyRequest) => (request.body as { email: string }).email;

// @node-rs/argon2 defaults to argon2id with OWASP-level cost.
const hashPassword = (password: string) => hash(password);
// Unknown emails still pay for one verify, so response time does not reveal which emails exist.
const dummyHash = hashPassword('not-a-real-password');

const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/auth/personas', { schema: { response: { 200: z.array(personaCard) } } }, async () => {
    if (!config.DEMO_MODE) return [];
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

  // Without DEMO_MODE the route does not exist (404).
  if (config.DEMO_MODE) {
    app.post(
      '/auth/demo-login',
      {
        onRequest: rateLimit({ max: 60, windowMs: 15 * MINUTE_MS }),
        schema: { body: z.object({ persona: Persona }), response: { 200: me } },
      },
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
  }

  app.post(
    '/auth/signup',
    {
      // 409 EMAIL_TAKEN tells whether an email has an account; the IP limit keeps that slow.
      onRequest: rateLimit({ max: 10, windowMs: 60 * MINUTE_MS }),
      schema: { body: signupInput, response: { 200: me } },
    },
    async (request, reply) => {
      const { name, email, password } = request.body;
      // Demo reset deletes these accounts, so a real one must never use the domain.
      if (isDemoEmail(email)) {
        throw new AppError(
          'VALIDATION_FAILED',
          400,
          'This email domain is reserved for demo accounts',
        );
      }
      const [row] = await app.db
        .insert(users)
        .values({ name, email, passwordHash: await hashPassword(password) })
        .onConflictDoNothing({ target: users.email })
        .returning({ id: users.id });
      if (!row) throw new AppError('EMAIL_TAKEN', 409, 'An account with this email already exists');
      await endSession(app.db, reply, request.cookies[SESSION_COOKIE]);
      request.user = await startSession(app.db, reply, row.id);
      return toMe(app.db, requireUser(request));
    },
  );

  app.post(
    '/auth/signin',
    {
      onRequest: rateLimit({ max: 10, windowMs: 15 * MINUTE_MS }),
      // Per account too, so guessing one password from many IPs stays slow.
      preHandler: rateLimit({ max: 10, windowMs: 15 * MINUTE_MS, key: bodyEmail }),
      schema: { body: signinInput, response: { 200: me } },
    },
    async (request, reply) => {
      const [row] = await app.db
        .select({ id: users.id, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, request.body.email));
      const valid = await verify(row?.passwordHash ?? (await dummyHash), request.body.password);
      if (!row?.passwordHash || !valid)
        throw new AppError('INVALID_CREDENTIALS', 401, 'Email or password is incorrect');
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
