import type { EventDetail } from '@gatherly/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { RequireEntitlement } from '@/components/require-entitlement';
import { EventForm } from '@/features/organizer/event-form';
import { newEventForm } from '@/features/organizer/event-form-schema';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function Component() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (
    <RequireEntitlement entitlement="events:create">
      <div className="page-container max-w-3xl py-8 sm:py-12">
        <p className="text-primary text-sm font-medium">New event</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Create an event</h1>
        <p className="text-muted-foreground mt-1 mb-8">
          It goes live as soon as you publish. You can edit it until it starts.
        </p>
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
      </div>
    </RequireEntitlement>
  );
}
