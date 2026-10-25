import { PlanCode, plan, subscription } from '@gatherly/shared';
import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { plans, subscriptions } from '../../db/schema';
import { requireUser } from '../../lib/guards';
import { mockPaymentProvider } from './payment-provider';

const planColumns = {
  code: plans.code,
  name: plans.name,
  priceCents: plans.priceCents,
  interval: plans.interval,
  entitlements: plans.entitlements,
};

const billingRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/billing/plans', { schema: { response: { 200: z.array(plan) } } }, () =>
    app.db.select(planColumns).from(plans).orderBy(asc(plans.priceCents)),
  );

  // Null when the user has never subscribed (they are on the free plan).
  app.get(
    '/billing/subscription',
    { schema: { response: { 200: subscription.nullable() } } },
    async (request) => {
      const user = requireUser(request);
      const [row] = await app.db
        .select({
          plan: planColumns,
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          provider: subscriptions.provider,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .where(eq(subscriptions.userId, user.id));
      if (!row) return null;
      return { ...row, currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null };
    },
  );

  app.post(
    '/billing/checkout',
    {
      schema: {
        body: z.object({ plan: PlanCode.exclude(['free']) }),
        response: { 200: z.object({ url: z.url() }) },
      },
    },
    (request) => {
      const user = requireUser(request);
      return mockPaymentProvider.createCheckout({ userId: user.id, plan: request.body.plan });
    },
  );
};

export default billingRoutes;
