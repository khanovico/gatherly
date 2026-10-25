import type { MyRegistration } from '@gatherly/shared';
import { Loader2, MapPin, TicketX } from 'lucide-react';
import { Link } from 'react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/features/events/category-badge';
import { EventDateTime } from '@/features/events/event-date-time';
import { eventLocation } from '@/features/events/lib';
import { useRegistration } from '@/features/events/registration';
import { cn } from '@/lib/utils';

type TicketCardProps = { registration: MyRegistration; past?: boolean };

/** A ticket: event on the left, a perforated stub with its status and actions on the right. */
export function TicketCard({ registration, past }: TicketCardProps) {
  const { event } = registration;
  const { cancel } = useRegistration(event);
  const cancelled = event.status === 'cancelled';

  return (
    <article className="bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md sm:flex-row">
      <img
        src={event.coverImage}
        alt=""
        className={cn('h-36 object-cover sm:h-auto sm:w-48', (past || cancelled) && 'grayscale')}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <CategoryBadge category={event.category} className="w-fit" />
        <h3 className="truncate text-lg font-semibold">
          <Link to={`/events/${event.id}`} className="hover:text-primary">
            {event.title}
          </Link>
        </h3>
        <EventDateTime event={event} compact />
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPin className="size-4" /> {eventLocation(event)}
        </p>
      </div>
      {/* Perforation: a dashed edge with half-circle notches cut out of the card. */}
      <div className="relative flex flex-col justify-center gap-3 border-t-2 border-dashed p-5 sm:w-52 sm:border-t-0 sm:border-l-2">
        <span className="bg-background absolute -top-3 -left-3 size-6 rounded-full border max-sm:hidden" />
        <span className="bg-background absolute -bottom-3 -left-3 size-6 rounded-full border max-sm:hidden" />
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Admit one · {registration.id.slice(0, 8)}
        </p>
        {cancelled ? (
          <Badge variant="destructive">Event cancelled</Badge>
        ) : past ? (
          <Badge variant="secondary">Attended</Badge>
        ) : (
          <Badge className="bg-success/15 text-success">Confirmed</Badge>
        )}
        {!past && !cancelled && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={cancel.isPending}>
                {cancel.isPending ? <Loader2 className="animate-spin" /> : <TicketX />} Cancel
                <span className="sr-only">registration for {event.title}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel your seat?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your seat at {event.title} goes back to the community. You can register again
                  while seats remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my seat</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => cancel.mutate()}>
                  Cancel registration
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </article>
  );
}
