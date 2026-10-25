import { ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AccessDenied } from '@/features/admin/access-denied';
import { OverviewTab } from '@/features/admin/overview-tab';
import { useMe } from '@/hooks/use-me';

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
      <OverviewTab />
    </div>
  );
}
