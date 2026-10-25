import type { EventSummary } from '@gatherly/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Ellipsis, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Edit and cancel for an upcoming event. Cancelling asks first: it cannot be undone. */
export function EventActions({ event }: { event: EventSummary }) {
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => apiFetch(`/events/${event.id}/cancel`, { method: 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.my.events }),
      ]);
      setConfirming(false);
      toast.success(`“${event.title}” was cancelled`);
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More actions for ${event.title}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/organizer/events/${event.id}/edit`}>
              <Pencil /> Edit event
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
            <Ban /> Cancel event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Cancel “${event.title}”?`}
        description={`The event page will show it as cancelled and registration closes. ${event.registeredCount} registered ${event.registeredCount === 1 ? 'attendee stays' : 'attendees stay'} on the list. This can't be undone.`}
        confirmLabel="Cancel event"
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      />
    </>
  );
}
