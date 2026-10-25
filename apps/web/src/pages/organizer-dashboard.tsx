import { RequireEntitlement } from '@/components/require-entitlement';
import { DashboardPage } from '@/features/organizer/dashboard-page';

export function Component() {
  return (
    <RequireEntitlement entitlement="events:create">
      <DashboardPage />
    </RequireEntitlement>
  );
}
