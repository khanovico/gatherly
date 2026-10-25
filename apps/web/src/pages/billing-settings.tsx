import type { Entitlement } from '@gatherly/shared';
import { ArrowRight, Check, CreditCard, Gem, Lock, Settings2 } from 'lucide-react';
import { Link } from 'react-router';
import { ComingSoonDialog } from '@/components/coming-soon-dialog';
import { RequireSignIn } from '@/components/require-entitlement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { premiumPerks } from '@/features/billing/perks';
import { formatPrice, usePlans, useSubscription } from '@/features/billing/queries';
import { hasEntitlement, useMe } from '@/hooks/use-me';
import { cn } from '@/lib/utils';

const features: { label: string; entitlement?: Entitlement; comingSoon?: boolean }[] = [
  { label: 'Discover and register for events' },
  { label: 'Create events and manage guest lists', entitlement: 'events:create' },
  { label: 'Sell paid tickets', entitlement: 'tickets:sell', comingSoon: true },
];

export function Component() {
  return (
    <RequireSignIn>
      <section className="page-container py-10 sm:py-14">
        <h1 className="text-3xl font-semibold sm:text-4xl">Plan & billing</h1>
        <p className="text-muted-foreground mt-2">Your plan, what it includes, and how you pay.</p>
        <BillingOverview />
      </section>
    </RequireSignIn>
  );
}

function BillingOverview() {
  const { data: me } = useMe();
  const { data: subscription, isPending } = useSubscription();
  const { data: plans } = usePlans();
  if (!me || isPending) return <Skeleton className="mt-8 h-80 rounded-xl" />;

  const plan = subscription?.plan ?? plans?.find((p) => p.code === me.plan);
  const canHost = hasEntitlement(me, 'events:create');
  const isAdmin = me.user.role === 'admin';
  const note = isAdmin
    ? 'Admins get every feature through their role.'
    : subscription?.provider === 'comp'
      ? 'Complimentary plan granted by an admin.'
      : subscription
        ? 'Demo subscription: no card is charged.'
        : 'Free forever. Upgrade any time.';

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardDescription>Current plan</CardDescription>
          <CardTitle className="flex flex-wrap items-center gap-3 text-3xl">
            {isAdmin ? 'Admin access' : (plan?.name ?? 'Free')}
            <Badge variant="outline" className="border-success/40 text-success">
              Active
            </Badge>
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {plan && !isAdmin && `${formatPrice(plan.priceCents)} / ${plan.interval} · `}
            {note}
          </p>
        </CardHeader>
        <Separator />
        <CardContent>
          <h2 className="mb-4 font-medium">What&apos;s included</h2>
          <ul className="space-y-3">
            {features.map(({ label, entitlement, comingSoon }) => {
              const included = !entitlement || hasEntitlement(me, entitlement);
              return (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'grid size-7 place-items-center rounded-full',
                      included ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {included ? <Check className="size-4" /> : <Lock className="size-3.5" />}
                  </span>
                  <span className={included ? undefined : 'text-muted-foreground'}>{label}</span>
                  {comingSoon && <Badge variant="secondary">Coming soon</Badge>}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {canHost ? (
          <Card>
            <CardHeader>
              <CardTitle>Manage subscription</CardTitle>
              <CardDescription>Invoices, payment methods and cancellation.</CardDescription>
            </CardHeader>
            <CardContent>
              <ComingSoonDialog
                title="Billing portal is coming soon"
                description="Invoices, payment methods and cancellation arrive with real payments (Stripe Billing). Your Premium access is active in the meantime."
                trigger={
                  <Button variant="outline" className="w-full">
                    <Settings2 /> Manage billing
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-brand text-primary-foreground overflow-hidden border-0 pt-0">
            <img
              src="/images/covers/community-2.webp"
              alt=""
              className="h-36 w-full object-cover"
            />
            <CardHeader>
              <Gem className="size-6" />
              <CardTitle className="text-xl">Host your own events</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {premiumPerks.map((perk) => perk.title).join(' · ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/pricing">
                  Upgrade to Premium <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="bg-muted grid size-11 shrink-0 place-items-center rounded-xl">
              <CreditCard className="text-muted-foreground size-5" />
            </span>
            <span className="text-sm">
              <span className="block font-medium">No payment method</span>
              <span className="text-muted-foreground">Payments are not live in this demo.</span>
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
