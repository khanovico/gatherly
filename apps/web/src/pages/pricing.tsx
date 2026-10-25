import { useMutation } from '@tanstack/react-query';
import { Check, Gem, Loader2, Minus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ComingSoonDialog } from '@/components/coming-soon-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { premiumPerks } from '@/features/billing/perks';
import { formatPrice, usePlans } from '@/features/billing/queries';
import { hasEntitlement, useMe } from '@/hooks/use-me';
import { ApiError, apiFetch, errorMessage } from '@/lib/api';

const freePerks = [
  'Discover events near you and online',
  'Register in one click',
  'Every ticket in one place',
];

const comparison: [feature: string, free: boolean, premium: boolean | string][] = [
  ['Discover and search events', true, true],
  ['Register and manage tickets', true, true],
  ['Create and publish events', false, true],
  ['Edit events and manage guest lists', false, true],
  ['Organizer dashboard', false, true],
  ['Sell paid tickets', false, 'Coming soon'],
];

const Mark = ({ value }: { value: boolean | string }) =>
  typeof value === 'string' ? (
    <Badge variant="secondary">{value}</Badge>
  ) : value ? (
    <Check className="text-success mx-auto size-5" aria-label="Included" />
  ) : (
    <Minus className="text-muted-foreground/60 mx-auto size-5" aria-label="Not included" />
  );

export function Component() {
  const { data: me } = useMe();
  const { data: plans } = usePlans();
  const navigate = useNavigate();
  const [comingSoon, setComingSoon] = useState(false);
  const checkout = useMutation({
    mutationFn: () => apiFetch('/billing/checkout', { method: 'POST', body: { plan: 'premium' } }),
    onError: (error) =>
      error instanceof ApiError && error.code === 'COMING_SOON'
        ? setComingSoon(true)
        : toast.error(errorMessage(error)),
  });
  const current = me && (hasEntitlement(me, 'events:create') ? 'premium' : 'free');

  return (
    <section className="page-container py-12 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
          Join for free. <span className="text-brand">Host with Premium.</span>
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Going to events is always free. Upgrade when you are ready to bring people together.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {plans?.map((plan) => {
          const premium = plan.code === 'premium';
          const isCurrent = current === plan.code;
          const perks = premium
            ? premiumPerks.map((perk) => perk.title + (perk.comingSoon ? ' (soon)' : ''))
            : freePerks;
          return (
            <Card
              key={plan.code}
              className={premium ? 'ring-primary shadow-primary/10 shadow-xl ring-2' : undefined}
            >
              <CardHeader>
                <h2 className="flex items-center justify-between text-xl font-semibold">
                  {plan.name}
                  {premium && <Badge className="bg-brand">Most popular</Badge>}
                </h2>
                <p>
                  <span className="text-4xl font-semibold tracking-tight">
                    {formatPrice(plan.priceCents)}
                  </span>
                  <span className="text-muted-foreground"> / {plan.interval}</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <ul className="space-y-3 text-sm">
                  {perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <Check className="text-success size-4 shrink-0" /> {perk}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto grid">
                  {premium && !isCurrent ? (
                    <Button
                      className="bg-brand hover:opacity-90"
                      disabled={checkout.isPending}
                      onClick={() => (me ? checkout.mutate() : navigate('/signin?next=/pricing'))}
                    >
                      {checkout.isPending ? <Loader2 className="animate-spin" /> : <Gem />} Upgrade
                      to Premium
                    </Button>
                  ) : (
                    (isCurrent || !me) && (
                      <Button
                        variant="outline"
                        disabled={isCurrent}
                        onClick={() => navigate('/signin')}
                      >
                        {isCurrent ? 'Your current plan' : 'Get started free'}
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }) ?? [1, 2].map((key) => <Skeleton key={key} className="h-96 rounded-xl" />)}
      </div>

      <Card className="mx-auto mt-16 max-w-4xl py-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">Compare plans</TableHead>
              <TableHead className="w-32 text-center">Free</TableHead>
              <TableHead className="w-32 text-center">Premium</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.map(([feature, free, premium]) => (
              <TableRow key={feature}>
                <TableCell className="px-6 font-medium">{feature}</TableCell>
                <TableCell className="text-center">
                  <Mark value={free} />
                </TableCell>
                <TableCell className="text-center">
                  <Mark value={premium} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ComingSoonDialog
        open={comingSoon}
        onOpenChange={setComingSoon}
        title="Premium checkout is almost here"
        description="Payments are not live in this demo. Real subscriptions will run on Stripe Billing, with upgrades taking effect instantly. Ask an admin to grant Premium in the meantime."
      />
    </section>
  );
}
