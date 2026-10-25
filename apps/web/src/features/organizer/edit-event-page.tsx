import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { IllustratedState } from '@/components/illustrated-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvent } from '@/features/events/queries';
import { EventForm } from '@/features/organizer/event-form';
import { eventToForm } from '@/features/organizer/event-form-schema';
import { EventFormPage } from '@/features/organizer/form-field';
import { OrganizerError } from '@/features/organizer/organizer-error';
import { useMe } from '@/hooks/use-me';
import { ApiError, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function EditEventPage() {
  const { id = '' } = useParams();
  const { data: me } = useMe();
  const event = useEvent(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [now] = useState(Date.now);

  if (event.error)
    return <OrganizerError error={event.error} onRetry={() => void event.refetch()} />;
  if (!event.data) {
    return (
      <div className="page-container max-w-6xl py-12" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-[36rem] rounded-xl" />
      </div>
    );
  }
  const detail = event.data;
  if (me && detail.organizerId !== me.user.id && me.user.role !== 'admin') {
    return <OrganizerError error={new ApiError(403, 'FORBIDDEN')} onRetry={() => {}} />;
  }
  if (detail.status === 'cancelled' || Date.parse(detail.startsAt) <= now) {
    return (
      <section className="page-container py-16 sm:py-24">
        <IllustratedState
          as="h1"
          image="/images/empty/no-events.webp"
          title="This event can no longer be edited"
          description={
            detail.status === 'cancelled' ? 'It was cancelled.' : 'It has already started.'
          }
        >
          <Button asChild variant="outline">
            <Link to="/organizer">Back to dashboard</Link>
          </Button>
        </IllustratedState>
      </section>
    );
  }
  return (
    <EventFormPage
      eyebrow="Edit event"
      title={detail.title}
      description="Changes show on the event page right away. Registered attendees keep their seats."
    >
      <EventForm
        defaultValues={eventToForm(detail)}
        submitLabel="Save changes"
        registeredCount={detail.registeredCount}
        onSubmit={async (input) => {
          await apiFetch(`/events/${id}`, { method: 'PATCH', body: input });
          await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
          await queryClient.invalidateQueries({ queryKey: queryKeys.my.events });
          toast.success('Changes saved');
          navigate('/organizer');
        }}
      />
    </EventFormPage>
  );
}
