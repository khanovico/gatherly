import type { Entitlement } from '@gatherly/shared';
import type { FastifyRequest } from 'fastify';
import type { AuthUser } from './auth';
import { isReadOnlyAccount } from './demo';
import { AppError } from './errors';

/** Signed-in, active user. Suspended accounts are blocked everywhere except logout. */
export const requireUser = (request: FastifyRequest): AuthUser => {
  const { user } = request;
  if (!user) throw new AppError('UNAUTHENTICATED', 401, 'Sign in to continue');
  if (user.status === 'suspended') throw new AppError('ACCOUNT_SUSPENDED', 403);
  return user;
};

export const requireAdmin = (request: FastifyRequest): AuthUser => {
  const user = requireUser(request);
  if (user.role !== 'admin') throw new AppError('FORBIDDEN', 403, 'Admins only');
  return user;
};

export const requireEntitlement = (request: FastifyRequest, entitlement: Entitlement): AuthUser => {
  const user = requireUser(request);
  if (!user.entitlements.includes(entitlement)) {
    throw new AppError('ENTITLEMENT_REQUIRED', 403, `Your plan does not include ${entitlement}`);
  }
  return user;
};

export const assertOwnerOrAdmin = (user: AuthUser, organizerId: string): void => {
  if (user.role !== 'admin' && user.id !== organizerId) {
    throw new AppError('FORBIDDEN', 403, 'Only the organizer or an admin can do this');
  }
};

/** For changes: on the public demo, the admin override never reaches what real accounts host. */
export const assertCanManage = (user: AuthUser, organizer: { id: string; email: string }) => {
  assertOwnerOrAdmin(user, organizer.id);
  if (user.id !== organizer.id && isReadOnlyAccount(organizer.email)) {
    throw new AppError('FORBIDDEN', 403, 'The public demo cannot change real accounts');
  }
};
