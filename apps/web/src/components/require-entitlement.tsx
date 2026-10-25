import type { Entitlement } from '@gatherly/shared';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from '@/features/billing/upgrade-prompt';
import { hasEntitlement, useMe } from '@/hooks/use-me';

/** Renders `children` only for a signed-in user; others go to `/signin` and come back after. */
export function RequireSignIn({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useMe();
  const { pathname, search } = useLocation();
  if (isPending) return <PageSkeleton />;
  if (!me) return <Navigate to={`/signin?next=${encodeURIComponent(pathname + search)}`} replace />;
  return children;
}

type RequireEntitlementProps = { entitlement: Entitlement; children: ReactNode };

/**
 * Gate for plan features, e.g. `<RequireEntitlement entitlement="events:create">`.
 * Users without it see the upgrade paywall. UI only: the API enforces the same rule.
 */
export function RequireEntitlement({ entitlement, children }: RequireEntitlementProps) {
  const { data: me } = useMe();
  return (
    <RequireSignIn>{hasEntitlement(me, entitlement) ? children : <UpgradePrompt />}</RequireSignIn>
  );
}

const PageSkeleton = () => (
  <div className="page-container space-y-4 py-12" aria-busy="true" aria-label="Loading">
    <Skeleton className="h-10 w-64" />
    <Skeleton className="h-72 w-full rounded-2xl" />
  </div>
);
