import type { EventSummary, ReasonKind } from '@gatherly/shared';
import {
  Clock,
  EllipsisVertical,
  EyeOff,
  Flame,
  Globe,
  Heart,
  MapPin,
  Navigation,
  Sparkles,
  Star,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/use-me';
import { CategoryBadge } from '@/features/events/category-badge';
import { EventDateTime } from '@/features/events/event-date-time';
import { hideEvent, useIsHidden, useSaveToggle } from '@/features/events/feedback';
import { eventLocation, formatDistance } from '@/features/events/lib';
import { SeatsMeter } from '@/features/events/seats-meter';
import { cn } from '@/lib/utils';

const overlay = 'bg-background/90 shadow-sm backdrop-blur';
const pill = cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5', overlay);
const reasonIcons: Record<ReasonKind, LucideIcon> = {
  interest: Sparkles,
  tag: Tag,
  distance: Navigation,
  time: Clock,
  popular: Flame,
  new: Star,
};

/**
 * Cover-image card linking to the event page. The whole card is clickable via the title link;
 * Save and "Not interested" sit above it. Ranked results show why they were picked.
 */
export function EventCard({ event, className }: { event: EventSummary; className?: string }) {
  const { data: me } = useMe();
  const toggleSave = useSaveToggle(event);
  if (useIsHidden(event.id)) return null;
  const LocationIcon = event.format === 'online' ? Globe : MapPin;
  const cancelled = event.status === 'cancelled';
  // The distance badge already says how far; reasons explain the rest.
  const reasons = (event.reasons ?? []).filter((r) => r.kind !== 'distance').slice(0, 2);
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
        <Button
          size="icon"
          variant="ghost"
          aria-pressed={Boolean(event.saved)}
          aria-label={event.saved ? `Unsave ${event.title}` : `Save ${event.title}`}
          onClick={toggleSave}
          className={cn(overlay, 'absolute top-2.5 right-2.5 z-10 rounded-full active:scale-90')}
        >
          <Heart className={cn('transition', event.saved && 'fill-rose-500 text-rose-500')} />
        </Button>
        <div className="absolute bottom-3 left-3 flex gap-1.5 text-xs font-semibold">
          <span className={cn(pill, cancelled && 'text-destructive')}>
            {cancelled ? 'Cancelled' : event.priceCents === 0 ? 'Free' : 'Paid'}
          </span>
          {event.distanceKm !== undefined && (
            <span className={pill}>
              <Navigation aria-hidden className="size-3" />
              {formatDistance(event.distanceKm)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <EventDateTime event={event} compact />
          {me && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`More options for ${event.title}`}
                  className="relative z-10 -mt-1 -mr-2 shrink-0"
                >
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onSelect={() => hideEvent(event)}>
                  <EyeOff /> Not interested
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <h3 className="line-clamp-2 text-lg leading-snug font-semibold">
          <Link to={`/events/${event.id}`} className="outline-none after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <LocationIcon aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{eventLocation(event)}</span>
        </p>
        <ul aria-label="Why you're seeing this" className="flex flex-wrap gap-1.5 empty:hidden">
          {reasons.map(({ kind, label }) => {
            const Icon = reasonIcons[kind];
            return (
              <li
                key={label}
                className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              >
                <Icon aria-hidden className="size-3" />
                {label}
              </li>
            );
          })}
        </ul>
        {!cancelled && <SeatsMeter seats={event} className="mt-auto pt-1" />}
      </div>
    </article>
  );
}

export function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border', className)} aria-hidden>
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
