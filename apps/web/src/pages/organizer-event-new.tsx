import type { EventDetail } from '@gatherly/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { RequireEntitlement } from '@/components/require-entitlement';
import { EventForm } from '@/features/organizer/event-form';
import { newEventForm } from '@/features/organizer/event-form-schema';
import { EventFormPage } from '@/features/organizer/form-field';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function Component() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (
    <RequireEntitlement entitlement="events:create">
      <EventFormPage
        eyebrow="New event"
        title="Create an event"
        description="It goes live as soon as you publish. You can edit it until it starts."
      >
        <EventForm
          defaultValues={newEventForm()}
          submitLabel="Publish event"
          onSubmit={async (input) => {
            const event = await apiFetch<EventDetail>('/events', { method: 'POST', body: input });
            await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
            await queryClient.invalidateQueries({ queryKey: queryKeys.my.events });
            toast.success(`“${event.title}” is live`);
            navigate(`/events/${event.id}`);
          }}
        />
      </EventFormPage>
    </RequireEntitlement>
  );
}
