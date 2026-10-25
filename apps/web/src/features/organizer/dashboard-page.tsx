import type { EventSummary } from '@gatherly/shared';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Gauge, Plus, Ticket, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizerError } from '@/features/organizer/organizer-error';
import { OrganizerEventRow } from '@/features/organizer/organizer-event-row';
import { useMe } from '@/hooks/use-me';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const createButton = (
  <Button asChild size="lg" className="bg-brand hover:opacity-90">
    <Link to="/organizer/events/new">
      <Plus /> Create event
    </Link>
  </Button>
);

export function DashboardPage() {
  const { data: me } = useMe();
  const events = useQuery({
    queryKey: queryKeys.my.events,
    queryFn: () => apiFetch<EventSummary[]>('/me/events'),
  });
  if (events.error) {
    return <OrganizerError error={events.error} onRetry={() => void events.refetch()} />;
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
      {events.data ? (
        <Overview events={events.data} />
      ) : (
        <Skeleton className="mt-8 h-96 rounded-xl" />
      )}
    </div>
  );
}

function Overview({ events }: { events: EventSummary[] }) {
  const [now] = useState(Date.now);
  if (events.length === 0) {
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
  const published = events.filter((e) => e.status === 'published');
  const groups = {
    upcoming: published.filter((e) => Date.parse(e.startsAt) > now),
    past: published.filter((e) => Date.parse(e.startsAt) <= now).reverse(),
    cancelled: events.filter((e) => e.status === 'cancelled'),
  };
  const registrations = published.reduce((sum, e) => sum + e.registeredCount, 0);
  const fill = mean(groups.upcoming.map((e) => e.registeredCount / e.capacity));

  return (
    <>
      <section aria-label="Key numbers" className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={CalendarDays}
          label="Upcoming events"
          value={String(groups.upcoming.length)}
          caption={groups.upcoming[0] ? `Next: ${groups.upcoming[0].title}` : 'Nothing scheduled'}
        />
        <StatTile
          icon={Ticket}
          label="Total registrations"
          value={registrations.toLocaleString()}
          caption={`Across ${published.length} published ${published.length === 1 ? 'event' : 'events'}`}
        />
        <StatTile
          icon={Gauge}
          label="Average fill rate"
          value={fill === undefined ? '—' : `${Math.round(fill * 100)}%`}
          caption="Seats taken across upcoming events"
        />
      </section>
      <Tabs defaultValue="upcoming" className="mt-10">
        <TabsList variant="line" className="mb-4">
          {Object.entries(groups).map(([key, list]) => (
            <TabsTrigger key={key} value={key} className="px-3 capitalize">
              {key} <span className="text-muted-foreground tabular-nums">{list.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {Object.entries(groups).map(([key, list]) => (
          <TabsContent key={key} value={key}>
            <Card className="gap-0 py-0">
              {list.length ? (
                <ul className="divide-y">
                  {list.map((event) => (
                    <OrganizerEventRow key={event.id} event={event} ended={key === 'past'} />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground p-10 text-center text-sm">No {key} events.</p>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;

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
