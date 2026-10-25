import type { EventDetail, EventSummary } from '@gatherly/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/features/admin/confirm-dialog';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Cancel an upcoming event after confirmation. Past or cancelled events render nothing. */
export function CancelEventButton({ event }: { event: EventSummary }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => apiFetch<EventDetail>(`/events/${event.id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      setOpen(false);
      toast.success(`${event.title} was cancelled`);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
      ]);
    },
  });
  if (event.status === 'cancelled' || new Date(event.endsAt) < new Date()) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          Cancel<span className="sr-only"> {event.title}</span>
        </Button>
      }
      icon={CalendarX}
      title={`Cancel “${event.title}”?`}
      description={`It stops taking registrations and shows as cancelled to everyone, including its ${event.registeredCount} registered attendees. This cannot be undone.`}
      cancelLabel="Keep event"
      confirmLabel="Cancel event"
      pending={cancel.isPending}
      onConfirm={() => cancel.mutate()}
    />
  );
}
