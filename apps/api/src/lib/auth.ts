import { createHash, randomBytes } from 'node:crypto';
import cookie from '@fastify/cookie';
import { Entitlement, type Me, type PlanCode, type Role, type UserStatus } from '@gatherly/shared';
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { config } from '../config';
import type { Db } from '../db/client';
import { plans, sessions, subscriptions, users } from '../db/schema';

export type AuthUser = {
  id: string;
  name: string;
  role: Role;
  status: UserStatus;
  plan: PlanCode;
  entitlements: Entitlement[];
};

declare module 'fastify' {
  interface FastifyRequest {
    /** Set on every API request: the session's user, or null when signed out. */
    user: AuthUser | null;
  }
}

export const SESSION_COOKIE = 'gatherly_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// The cookie holds a random token; only its hash is stored.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const loadUser = async (db: Db, token: string): Promise<AuthUser | null> => {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
      plan: plans.code,
      planEntitlements: plans.entitlements,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(
      subscriptions,
      and(eq(subscriptions.userId, users.id), eq(subscriptions.status, 'active')),
    )
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())));
  if (!row) return null;
  const { planEntitlements, ...user } = row;
  return {
    ...user,
    // No active subscription means the free plan; admins hold every entitlement.
    plan: user.plan ?? 'free',
    entitlements: user.role === 'admin' ? Entitlement.options : (planEntitlements ?? []),
  };
};

export const startSession = async (db: Db, reply: FastifyReply, userId: string) => {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    expires: expiresAt,
  });
  return loadUser(db, token);
};

export const endSession = async (db: Db, reply: FastifyReply, token: string | undefined) => {
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
};

export const toMe = async (db: Db, user: AuthUser): Promise<Me> => {
  const [profile] = await db
    .select({ email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, user.id));
  const { plan, entitlements, ...rest } = user;
  return { user: { ...rest, ...profile! }, plan, entitlements };
};

/** Parses cookies and resolves `request.user` for every route in the given scope. */
export const registerAuth = async (api: FastifyInstance) => {
  await api.register(cookie);
  api.decorateRequest('user', null);
  api.addHook('onRequest', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    request.user = token ? await loadUser(api.db, token) : null;
  });
};
