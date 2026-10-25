import type { EventSummary } from '@gatherly/shared';
import { Users } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/features/events/category-badge';
import { EventDateTime } from '@/features/events/event-date-time';
import { SeatsMeter } from '@/features/events/seats-meter';

export function OrganizerEventRow({ event, ended }: { event: EventSummary; ended: boolean }) {
  const cancelled = event.status === 'cancelled';
  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <img
        src={event.coverImage}
        alt=""
        loading="lazy"
        className="h-28 w-full rounded-lg object-cover sm:aspect-video sm:h-auto sm:w-36"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <CategoryBadge category={event.category} />
          {cancelled && <Badge variant="destructive">Cancelled</Badge>}
          {ended && <Badge variant="secondary">Ended</Badge>}
        </div>
        <h3 className="truncate font-semibold">
          <Link to={`/events/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </h3>
        <EventDateTime event={event} compact />
      </div>
      <SeatsMeter seats={event} className="sm:w-44" />
      <Button asChild variant="outline">
        <Link to={`/organizer/events/${event.id}/attendees`}>
          <Users /> Attendees
        </Link>
      </Button>
    </li>
  );
}
