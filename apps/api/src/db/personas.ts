import type { Persona, PlanCode } from '@gatherly/shared';
import type { Db } from './client';
import { plans, subscriptions, users } from './schema';

export const PLANS = [
  { code: 'free', name: 'Free', priceCents: 0, interval: 'month', entitlements: [] },
  {
    code: 'premium',
    name: 'Premium',
    priceCents: 1900,
    interval: 'month',
    entitlements: ['events:create'],
  },
] satisfies (typeof plans.$inferInsert)[];

type PersonaSeed = Pick<typeof users.$inferInsert, 'email' | 'name' | 'avatarUrl' | 'role'> & {
  plan: PlanCode;
};

export const PERSONAS: Record<Persona, PersonaSeed> = {
  organizer: {
    email: 'olivia@gatherly.demo',
    name: 'Olivia Bennett',
    avatarUrl: '/images/avatars/olivia.webp',
    role: 'member',
    plan: 'premium',
  },
  attendee: {
    email: 'alex@gatherly.demo',
    name: 'Alex Morgan',
    avatarUrl: '/images/avatars/alex.webp',
    role: 'member',
    plan: 'free',
  },
  admin: {
    email: 'sam@gatherly.demo',
    name: 'Sam Patel',
    avatarUrl: '/images/avatars/sam.webp',
    role: 'admin',
    plan: 'free',
  },
};

/** Idempotent: creates the plans, the protected demo personas and their paid subscriptions. */
export const ensurePersonas = (db: Db) =>
  db.transaction(async (tx) => {
    const planIds = new Map<PlanCode, string>();
    for (const plan of PLANS) {
      const [row] = await tx
        .insert(plans)
        .values(plan)
        .onConflictDoUpdate({ target: plans.code, set: plan })
        .returning({ id: plans.id });
      planIds.set(plan.code, row!.id);
    }

    for (const { plan, ...user } of Object.values(PERSONAS)) {
      const [row] = await tx
        .insert(users)
        .values({ ...user, isProtected: true })
        .onConflictDoUpdate({ target: users.email, set: { isProtected: true } })
        .returning({ id: users.id });
      if (plan === 'free') continue;
      await tx
        .insert(subscriptions)
        .values({ userId: row!.id, planId: planIds.get(plan)!, provider: 'mock' })
        .onConflictDoNothing({ target: subscriptions.userId });
    }
  });
