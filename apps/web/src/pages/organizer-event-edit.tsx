import { RequireEntitlement } from '@/components/require-entitlement';
import { EditEventPage } from '@/features/organizer/edit-event-page';

export function Component() {
  return (
    <RequireEntitlement entitlement="events:create">
      <EditEventPage />
    </RequireEntitlement>
  );
}
