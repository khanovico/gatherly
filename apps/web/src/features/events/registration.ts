import type { ErrorCode, EventDetail, Registration } from '@gatherly/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ApiError, apiFetch, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

type Action = 'register' | 'cancel';

const copy: Partial<Record<ErrorCode, string>> = {
  UNAUTHENTICATED: 'Your session ended. Sign in again to continue.',
  ACCOUNT_SUSPENDED: 'Your account is suspended, so registrations are paused.',
  NOT_FOUND: 'This event no longer exists.',
  EVENT_FULL: 'So close! The last seat was just taken.',
  EVENT_CANCELLED: 'The organizer cancelled this event.',
  ALREADY_REGISTERED: "You're already on the list for this event.",
  NOT_REGISTERED: "You're not registered for this event anymore.",
};

function failureMessage(error: unknown, action: Action) {
  if (!(error instanceof ApiError)) return errorMessage(error);
  if (error.code === 'EVENT_STARTED')
    return action === 'register'
      ? 'Registration closed when the event started.'
      : "It's too late to cancel: the event has already started.";
  return copy[error.code] ?? errorMessage(error);
}

/**
 * Register for / cancel a seat at one event. Both update the event page optimistically (seat
 * count and the viewer's registration), roll back with a friendly toast on failure, and refresh
 * every event list and the viewer's tickets once settled.
 */
export function useRegistration(event: Pick<EventDetail, 'id' | 'title'>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const key = queryKeys.events.detail(event.id);

  const options = (action: Action) => ({
    mutationFn: () =>
      action === 'register'
        ? apiFetch<Registration>(`/events/${event.id}/registrations`, { method: 'POST' })
        : apiFetch<Registration>(`/events/${event.id}/registrations/me`, { method: 'DELETE' }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EventDetail>(key);
      if (previous)
        queryClient.setQueryData<EventDetail>(key, {
          ...previous,
          registeredCount: previous.registeredCount + (action === 'register' ? 1 : -1),
          viewerRegistration:
            action === 'register'
              ? {
                  id: 'pending',
                  eventId: event.id,
                  userId: '',
                  status: 'confirmed',
                  createdAt: new Date().toISOString(),
                  cancelledAt: null,
                }
              : null,
        });
      return { previous };
    },
    onError: (error: unknown, _: void, context?: { previous?: EventDetail }) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(failureMessage(error, action));
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.my.registrations }),
      ]),
  });

  const register = useMutation({
    ...options('register'),
    onSuccess: () =>
      toast.success("You're going! Your seat is confirmed.", {
        description: event.title,
        action: { label: 'My tickets', onClick: () => navigate('/me/registrations') },
      }),
  });
  const cancel = useMutation({
    ...options('cancel'),
    onSuccess: () =>
      toast('Registration cancelled', {
        description: 'Your seat has been released.',
        duration: 8000,
        action: { label: 'Undo', onClick: () => register.mutate() },
      }),
  });
  return { register, cancel };
}
