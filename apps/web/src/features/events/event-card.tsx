import type { EventSummary } from '@gatherly/shared';
import { Globe, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryBadge } from '@/features/events/category-badge';
import { EventDateTime } from '@/features/events/event-date-time';
import { eventLocation } from '@/features/events/lib';
import { SeatsMeter } from '@/features/events/seats-meter';
import { cn } from '@/lib/utils';

const overlay = 'bg-background/90 shadow-sm backdrop-blur';

/** Cover-image card linking to the event page. The whole card is clickable via the title link. */
export function EventCard({ event, className }: { event: EventSummary; className?: string }) {
  const LocationIcon = event.format === 'online' ? Globe : MapPin;
  const cancelled = event.status === 'cancelled';
  return (
    <article
      className={cn(
        'group bg-card relative flex flex-col overflow-hidden rounded-2xl border shadow-xs transition',
        'focus-within:ring-ring/50 focus-within:ring-[3px] hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
    >
      <div className="bg-muted relative aspect-video overflow-hidden">
        <img
          src={event.coverImage}
          alt=""
          loading="lazy"
          className={cn(
            'size-full object-cover transition duration-500 group-hover:scale-105',
            cancelled && 'grayscale',
          )}
        />
        <CategoryBadge category={event.category} className={cn('absolute top-3 left-3', overlay)} />
        <span
          className={cn(
            'absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            overlay,
            cancelled && 'text-destructive',
          )}
        >
          {cancelled ? 'Cancelled' : event.priceCents === 0 ? 'Free' : 'Paid'}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <EventDateTime event={event} compact />
        <h3 className="line-clamp-2 text-lg leading-snug font-semibold">
          <Link to={`/events/${event.id}`} className="outline-none after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <LocationIcon aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{eventLocation(event)}</span>
        </p>
        {!cancelled && <SeatsMeter seats={event} className="mt-auto pt-1" />}
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border" aria-hidden>
      <Skeleton className="aspect-video rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-1.5 w-full" />
      </div>
    </div>
  );
}
