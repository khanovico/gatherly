import { z } from 'zod';
import { isoDateTime } from './common';
import { Entitlement, PlanCode } from './enums';

export const plan = z.object({
  code: PlanCode,
  name: z.string(),
  priceCents: z.int().min(0),
  interval: z.enum(['month', 'year']),
  entitlements: z.array(Entitlement),
});
export type Plan = z.infer<typeof plan>;

export const subscription = z.object({
  plan,
  status: z.enum(['active', 'canceled', 'past_due']),
  currentPeriodEnd: isoDateTime.nullable(),
  /** `comp` = granted by an admin; `mock` = stand-in for the future payment provider. */
  provider: z.enum(['mock', 'comp']),
});
export type Subscription = z.infer<typeof subscription>;
