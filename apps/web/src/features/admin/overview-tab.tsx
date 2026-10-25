import type { AdminStats } from '@gatherly/shared';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Gem, Ticket, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

type Segment = { label: string; value: number; color: string };

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

const tiles = (s: AdminStats) => [
  {
    label: 'Members',
    value: s.totalUsers,
    hint: `${s.suspendedUsers} suspended`,
    icon: Users,
    tone: 'bg-primary/10 text-primary',
  },
  {
    label: 'Premium organizers',
    value: s.premiumUsers,
    hint: `${percent(s.premiumUsers, s.totalUsers)}% of members`,
    icon: Gem,
    tone: 'bg-warning/15 text-warning',
  },
  {
    label: 'Upcoming events',
    value: s.upcomingEvents,
    hint: `${s.totalEvents} events in total`,
    icon: CalendarDays,
    tone: 'bg-success/15 text-success',
  },
  {
    label: 'Confirmed tickets',
    value: s.confirmedRegistrations,
    hint: `${s.totalEvents ? (s.confirmedRegistrations / s.totalEvents).toFixed(1) : 0} per event`,
    icon: Ticket,
    tone: 'bg-accent text-accent-foreground',
  },
];

export function OverviewTab() {
  const { data: stats, isError } = useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => apiFetch<AdminStats>('/admin/stats'),
  });
  if (isError) return <p className="text-muted-foreground py-10">Couldn't load platform stats.</p>;
  if (!stats) return <Skeleton className="h-72 rounded-xl" />;

  const pastEvents = stats.totalEvents - stats.upcomingEvents - stats.cancelledEvents;
  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles(stats).map(({ label, value, hint, icon: Icon, tone }) => (
          <li key={label}>
            <Card className="h-full gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">{label}</span>
                <span className={cn('grid size-9 place-items-center rounded-lg', tone)}>
                  <Icon className="size-4" aria-hidden />
                </span>
              </div>
              <p className="text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
              <p className="text-muted-foreground text-xs">{hint}</p>
            </Card>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="Members by plan"
          segments={[
            { label: 'Premium', value: stats.premiumUsers, color: 'bg-primary' },
            { label: 'Free', value: stats.totalUsers - stats.premiumUsers, color: 'bg-primary/35' },
          ]}
        />
        <Breakdown
          title="Events by status"
          segments={[
            { label: 'Upcoming', value: stats.upcomingEvents, color: 'bg-success' },
            { label: 'Past', value: pastEvents, color: 'bg-muted-foreground/40' },
            { label: 'Cancelled', value: stats.cancelledEvents, color: 'bg-destructive' },
          ]}
        />
      </div>
    </div>
  );
}

/** Part-to-whole bar with a legend, so no segment is identified by color alone. */
function Breakdown({ title, segments }: { title: string; segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const summary = segments.map((s) => `${s.label} ${s.value}`).join(', ');
  return (
    <Card className="gap-4 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-muted-foreground text-sm tabular-nums">{total} total</span>
      </div>
      <div role="img" aria-label={`${title}: ${summary}`} className="flex h-3 gap-0.5">
        {segments.map((s) => (
          <div key={s.label} className={cn('rounded-sm', s.color)} style={{ flexGrow: s.value }} />
        ))}
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={cn('size-2.5 rounded-full', s.color)} aria-hidden />
            <dt className="text-muted-foreground">{s.label}</dt>
            <dd className="font-medium tabular-nums">
              {s.value} ({percent(s.value, total)}%)
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
