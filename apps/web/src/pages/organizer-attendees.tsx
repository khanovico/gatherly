import { RequireEntitlement } from '@/components/require-entitlement';
import { AttendeesPage } from '@/features/organizer/attendees-page';

export function Component() {
  return (
    <RequireEntitlement entitlement="events:create">
      <AttendeesPage />
    </RequireEntitlement>
  );
}
