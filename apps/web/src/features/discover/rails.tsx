import type { DiscoverHome, DiscoverHomeQuery, DiscoverRail } from '@gatherly/shared';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Flame, MapPin, Sparkles, type LucideIcon } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { EventCard, EventCardSkeleton } from '@/features/events/event-card';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const railMeta: Record<DiscoverRail, { icon: LucideIcon; blurb: string }> = {
  for_you: { icon: Sparkles, blurb: 'Picked from your interests, neighborhood and schedule' },
  near_you: { icon: MapPin, blurb: 'Within your travel radius, this weekend' },
  popular: { icon: Flame, blurb: 'Filling up fast across the city' },
};
const slide = 'w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]';

function useDiscoverHome(query: Partial<DiscoverHomeQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.events.home(query),
    queryFn: () => {
      const params = Object.entries(query).flatMap(([k, v]) =>
        v === undefined ? [] : [[k, `${v}`]],
      );
      return apiFetch<DiscoverHome>(`/discover/home?${new URLSearchParams(params)}`);
    },
  });
}

/** "For you", "Near you this weekend" and "Popular now" as swipeable rows, in the API's order. */
export function DiscoverRails({
  query,
  className,
}: {
  query?: Partial<DiscoverHomeQuery>;
  className?: string;
}) {
  const { data, isPending } = useDiscoverHome(query);
  if (isPending)
    return <Rail title="Loading picks" icon={Sparkles} blurb="" className={className} />;
  return data?.rails.map((rail) => (
    <Rail key={rail.id} title={rail.title} {...railMeta[rail.id]} className={className}>
      {rail.events.map((event, position) => (
        <EventCard
          key={event.id}
          event={event}
          className={slide}
          tracking={{
            surface: `rail_${rail.id}`,
            position,
            rankerVersion: data.rankerVersion,
            requestId: data.requestId,
          }}
        />
      ))}
    </Rail>
  ));
}

function Rail(props: {
  title: string;
  icon: LucideIcon;
  blurb: string;
  className?: string;
  children?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const page = (direction: 1 | -1) =>
    scroller.current?.scrollBy({
      left: direction * scroller.current.clientWidth,
      behavior: 'smooth',
    });
  const { icon: Icon, children } = props;
  return (
    <section aria-label={props.title} aria-busy={!children} className={props.className}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-xl">
            <Icon aria-hidden className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">
              {children ? (
                props.title
              ) : (
                <span className="bg-muted block h-6 w-40 animate-pulse rounded" />
              )}
            </h2>
            {props.blurb && <p className="text-muted-foreground text-sm">{props.blurb}</p>}
          </div>
        </div>
        <div className="flex gap-2 max-sm:hidden">
          {([-1, 1] as const).map((direction) => (
            <Button
              key={direction}
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label={
                direction < 0 ? `Scroll ${props.title} back` : `Scroll ${props.title} forward`
              }
              onClick={() => page(direction)}
            >
              {direction < 0 ? <ChevronLeft /> : <ChevronRight />}
            </Button>
          ))}
        </div>
      </div>
      <div
        ref={scroller}
        className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-6 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {children ??
          Array.from({ length: 3 }, (_, i) => <EventCardSkeleton key={i} className={slide} />)}
      </div>
    </section>
  );
}
