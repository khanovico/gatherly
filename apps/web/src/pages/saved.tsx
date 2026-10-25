import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { LoadMoreSentinel } from '@/components/load-more-sentinel';
import { RequireSignIn } from '@/components/require-entitlement';
import { Button } from '@/components/ui/button';
import { EventCard, EventCardSkeleton } from '@/features/events/event-card';
import { SaveButton } from '@/features/events/save-button';
import { useSavedEvents } from '@/features/events/saves';

export function Component() {
  return (
    <RequireSignIn>
      <Saved />
    </RequireSignIn>
  );
}

function Saved() {
  const { data, isPending, isError, hasNextPage, isFetching, fetchNextPage } = useSavedEvents();
  const events = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total;

  return (
    <section className="page-container py-10 sm:py-14">
      <h1 className="text-3xl font-semibold sm:text-4xl">Saved</h1>
      <p className="text-muted-foreground mt-2">
        {total ? `${total} saved ${total === 1 ? 'event' : 'events'}. ` : ''}Saves also tune your
        For you feed.
      </p>

      {isError ? (
        <IllustratedState
          image="/images/empty/error.webp"
          title="We couldn't load your saved events"
          description="Check your connection and refresh the page."
        />
      ) : !isPending && !events.length ? (
        <IllustratedState
          image="/images/empty/no-events.webp"
          title="Nothing saved yet"
          description="Tap the heart on any event to keep it here for later."
        >
          <Button asChild className="bg-brand hover:opacity-90">
            <Link to="/events">
              <Compass /> Find events
            </Link>
          </Button>
        </IllustratedState>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isPending
            ? [1, 2, 3].map((key) => (
                <li key={key}>
                  <EventCardSkeleton />
                </li>
              ))
            : events.map((event) => (
                <li key={event.id} className="relative">
                  <EventCard event={event} className="h-full" />
                  {/* Over the cover's bottom-right corner, clear of the card's own badges. */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 aspect-video">
                    <SaveButton
                      event={event}
                      className="pointer-events-auto absolute right-3 bottom-3"
                    />
                  </div>
                </li>
              ))}
        </ul>
      )}
      <LoadMoreSentinel
        onVisible={() => void fetchNextPage()}
        disabled={!hasNextPage || isFetching || isError}
      />
    </section>
  );
}
