import type { MyRegistrations } from '@gatherly/shared';
import { useQuery } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { RequireSignIn } from '@/components/require-entitlement';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketCard } from '@/features/registrations/ticket-card';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const tabs = {
  upcoming: {
    label: 'Upcoming',
    empty: 'No upcoming tickets',
    hint: 'Find something you love and save your seat.',
  },
  past: {
    label: 'Past',
    empty: 'No past events yet',
    hint: 'Events you attend will show up here afterwards.',
  },
};
type Tab = keyof typeof tabs;

export function Component() {
  return (
    <RequireSignIn>
      <MyTickets />
    </RequireSignIn>
  );
}

function MyTickets() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'past' ? 'past' : 'upcoming';
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.my.registrations,
    queryFn: () => apiFetch<MyRegistrations>('/me/registrations'),
  });

  const findEvents = (
    <Button asChild className="bg-brand hover:opacity-90">
      <Link to="/events">
        <Compass /> Find events
      </Link>
    </Button>
  );

  return (
    <section className="page-container py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">My tickets</h1>
          <p className="text-muted-foreground mt-2">
            Everything you&apos;re going to, in one place.
          </p>
        </div>
        {findEvents}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setParams({ tab: value }, { replace: true })}
        className="mt-8"
      >
        <TabsList>
          {(Object.keys(tabs) as Tab[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {tabs[key].label}
              {data && (
                <span className="text-muted-foreground tabular-nums">{data[key].length}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-6 grid gap-4">
          {isPending ? (
            [1, 2, 3].map((key) => <Skeleton key={key} className="h-40 rounded-2xl" />)
          ) : isError ? (
            <IllustratedState
              image="/images/empty/error.webp"
              title="We couldn't load your tickets"
              description="Check your connection and refresh the page."
            />
          ) : data[tab].length ? (
            data[tab].map((registration) => (
              <TicketCard key={registration.id} registration={registration} past={tab === 'past'} />
            ))
          ) : (
            <IllustratedState
              image="/images/empty/no-registrations.webp"
              title={tabs[tab].empty}
              description={tabs[tab].hint}
            >
              {tab === 'upcoming' && findEvents}
            </IllustratedState>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
