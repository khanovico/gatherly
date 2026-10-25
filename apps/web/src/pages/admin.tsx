import { Activity, CalendarDays, LayoutGrid, ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccessDenied } from '@/features/admin/access-denied';
import { DangerZone } from '@/features/admin/danger-zone';
import { EventsTab } from '@/features/admin/events-tab';
import { ObservabilityTab } from '@/features/admin/observability-tab';
import { OverviewTab } from '@/features/admin/overview-tab';
import { UsersTab } from '@/features/admin/users-tab';
import { useMe } from '@/hooks/use-me';

const sections = [
  { value: 'overview', label: 'Overview', icon: LayoutGrid, Panel: OverviewTab },
  { value: 'users', label: 'Users', icon: Users, Panel: UsersTab },
  { value: 'events', label: 'Events', icon: CalendarDays, Panel: EventsTab },
  { value: 'observability', label: 'Observability', icon: Activity, Panel: ObservabilityTab },
];

export function Component() {
  const { data: me, isPending } = useMe();
  if (isPending) return <Skeleton className="page-container mt-10 h-40 rounded-3xl" />;
  if (me?.user.role !== 'admin') return <AccessDenied signedIn={Boolean(me)} />;

  return (
    <div className="page-container space-y-8 py-10">
      <header className="bg-card relative overflow-hidden rounded-3xl border p-6 sm:p-8">
        <div
          aria-hidden
          className="bg-brand absolute -top-24 -right-16 size-72 rounded-full opacity-15 blur-3xl"
        />
        <div className="relative flex items-center gap-4">
          <div className="bg-brand text-primary-foreground shadow-primary/30 grid size-12 shrink-0 place-items-center rounded-2xl shadow-lg">
            <ShieldCheck className="size-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Admin console</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {me.user.name.split(' ')[0]}. Manage members, oversee events and keep
              the demo fresh.
            </p>
          </div>
        </div>
      </header>
      <AdminSections />
      <DangerZone />
    </div>
  );
}

/** The open section lives in `?tab=`, so it is linkable and survives a reload. */
function AdminSections() {
  const [params, setParams] = useSearchParams();
  const tab = sections.find((s) => s.value === params.get('tab'))?.value ?? 'overview';

  return (
    <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
      <TabsList variant="line" className="mb-6">
        {sections.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="px-3">
            <Icon aria-hidden /> {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map(({ value, Panel }) => (
        <TabsContent key={value} value={value}>
          <Panel />
        </TabsContent>
      ))}
    </Tabs>
  );
}
