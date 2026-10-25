import type { MyEvents, MyEventsQuery } from '@gatherly/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CalendarDays, Gauge, Plus, Ticket, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { LoadMoreSentinel } from '@/components/load-more-sentinel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizerError } from '@/features/organizer/organizer-error';
import { OrganizerEventRow } from '@/features/organizer/organizer-event-row';
import { useMe } from '@/hooks/use-me';
import { apiFetch, nextPage } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const createButton = (
  <Button asChild size="lg" className="bg-brand hover:opacity-90">
    <Link to="/organizer/events/new">
      <Plus /> Create event
    </Link>
  </Button>
);

type Tab = MyEventsQuery['when'];
const tabs: Tab[] = ['upcoming', 'past', 'cancelled'];

function useMyEvents(when: Tab) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.my.events, when],
    queryFn: ({ pageParam }) =>
      apiFetch<MyEvents>(`/me/events?when=${when}&page=${pageParam}&pageSize=20`),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function DashboardPage() {
  const { data: me } = useMe();
  // The upcoming tab's first page also carries the stats for every tab.
  const upcoming = useMyEvents('upcoming');
  if (upcoming.error) {
    return <OrganizerError error={upcoming.error} onRetry={() => void upcoming.refetch()} />;
  }
  return (
    <div className="page-container py-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-medium">Organizer</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
            Welcome back, {me?.user.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">Track registrations and manage your events.</p>
        </div>
        {createButton}
      </header>
      {upcoming.data ? (
        <Overview first={upcoming.data.pages[0]!} />
      ) : (
        <Skeleton className="mt-8 h-96 rounded-xl" />
      )}
    </div>
  );
}

function Overview({ first: { stats, items } }: { first: MyEvents }) {
  const [tab, setTab] = useState<Tab>('upcoming');
  if (stats.upcoming + stats.past + stats.cancelled === 0) {
    return (
      <Card className="mt-8">
        <IllustratedState
          image="/images/empty/no-events.webp"
          title="Host your first event"
          description="Pick a date, set the capacity and share it. Registrations show up here."
        >
          {createButton}
        </IllustratedState>
      </Card>
    );
  }
  const published = stats.upcoming + stats.past;

  return (
    <>
      <section aria-label="Key numbers" className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={CalendarDays}
          label="Upcoming events"
          value={String(stats.upcoming)}
          caption={items[0] ? `Next: ${items[0].title}` : 'Nothing scheduled'}
        />
        <StatTile
          icon={Ticket}
          label="Total registrations"
          value={stats.registrations.toLocaleString()}
          caption={`Across ${published} published ${published === 1 ? 'event' : 'events'}`}
        />
        <StatTile
          icon={Gauge}
          label="Average fill rate"
          value={stats.fillRate === null ? '—' : `${Math.round(stats.fillRate * 100)}%`}
          caption="Seats taken across upcoming events"
        />
      </section>
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="mt-10">
        <TabsList variant="line" className="mb-4">
          {tabs.map((key) => (
            <TabsTrigger key={key} value={key} className="px-3 capitalize">
              {key} <span className="text-muted-foreground tabular-nums">{stats[key]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <EventList when={tab} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function EventList({ when }: { when: Tab }) {
  const { data, isPending, isError, hasNextPage, isFetching, fetchNextPage } = useMyEvents(when);
  const events = data?.pages.flatMap((page) => page.items) ?? [];
  if (isPending) return <Skeleton className="h-60 rounded-xl" />;
  return (
    <Card className="gap-0 py-0">
      {events.length ? (
        <ul className="divide-y">
          {events.map((event) => (
            <OrganizerEventRow key={event.id} event={event} ended={when === 'past'} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground p-10 text-center text-sm">No {when} events.</p>
      )}
      <LoadMoreSentinel
        onVisible={() => void fetchNextPage()}
        disabled={!hasNextPage || isFetching || isError}
      />
    </Card>
  );
}

type StatTileProps = { icon: LucideIcon; label: string; value: string; caption: string };

function StatTile({ icon: Icon, label, value, caption }: StatTileProps) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-medium">{label}</h2>
        <span className="bg-accent text-accent-foreground grid size-9 place-items-center rounded-lg">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="text-4xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted-foreground truncate text-sm">{caption}</p>
    </Card>
  );
}
