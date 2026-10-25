import type { MyRegistrations } from '@gatherly/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { LoadMoreSentinel } from '@/components/load-more-sentinel';
import { RequireSignIn } from '@/components/require-entitlement';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketCard } from '@/features/registrations/ticket-card';
import { apiFetch, nextPage } from '@/lib/api';
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
  const { data, isPending, isError, hasNextPage, isFetching, fetchNextPage } = useInfiniteQuery({
    queryKey: [...queryKeys.my.registrations, tab],
    queryFn: ({ pageParam }) =>
      apiFetch<MyRegistrations>(`/me/registrations?when=${tab}&page=${pageParam}&pageSize=12`),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
  const counts = data?.pages[0]?.counts;
  const tickets = data?.pages.flatMap((page) => page.items) ?? [];

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
              {counts && <span className="text-muted-foreground tabular-nums">{counts[key]}</span>}
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
          ) : tickets.length ? (
            tickets.map((registration) => (
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
      <LoadMoreSentinel
        onVisible={() => void fetchNextPage()}
        disabled={!hasNextPage || isFetching || isError}
      />
    </section>
  );
}
