import { z } from 'zod';
import { isoDateTime } from './common';
import { Entitlement, PlanCode, Role, UserStatus } from './enums';

/** Public face of a user: organizer cards, attendee avatars. */
export const userSummary = z.object({
  id: z.uuid(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
export type UserSummary = z.infer<typeof userSummary>;

/** Users without a subscription are on `free`; admins get every entitlement through their role. */
export const me = z.object({
  user: userSummary.extend({ email: z.email(), role: Role, status: UserStatus }),
  plan: PlanCode,
  entitlements: z.array(Entitlement),
});
export type Me = z.infer<typeof me>;

export const adminUser = userSummary.extend({
  email: z.email(),
  role: Role,
  status: UserStatus,
  plan: PlanCode,
  /** Seeded demo personas: cannot be suspended, demoted or downgraded. */
  protected: z.boolean(),
  createdAt: isoDateTime,
});
export type AdminUser = z.infer<typeof adminUser>;

export const adminUserPatch = z
  .object({ status: UserStatus, role: Role, plan: PlanCode })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'Provide at least one of status, role, plan');
export type AdminUserPatch = z.infer<typeof adminUserPatch>;

export const adminStats = z.object({
  totalUsers: z.int(),
  suspendedUsers: z.int(),
  premiumUsers: z.int(),
  totalEvents: z.int(),
  upcomingEvents: z.int(),
  cancelledEvents: z.int(),
  confirmedRegistrations: z.int(),
});
export type AdminStats = z.infer<typeof adminStats>;
