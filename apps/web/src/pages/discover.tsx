import { CATEGORIES, type Category } from '@gatherly/shared';
import { ArrowUp, CalendarDays, RotateCw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { LoadMoreSentinel } from '@/components/load-more-sentinel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventCard, EventCardSkeleton } from '@/features/events/event-card';
import { categoryMeta } from '@/features/events/lib';
import { useInfiniteEvents } from '@/features/events/queries';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;
const whenLabels = { any: 'Any date', weekend: 'This weekend', week: 'Next 7 days' };
type When = keyof typeof whenLabels;

/** Start/end bounds in the viewer's calendar, rounded to midnight so query keys stay stable. */
function dateRange(when: When): { from?: string; to?: string } {
  if (when === 'any') return {};
  const shift = (days: number) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + days);
    return day.toISOString();
  };
  if (when === 'week') return { to: shift(7) };
  const dow = new Date().getDay();
  const toSaturday = dow === 0 ? -1 : 6 - dow; // Saturday 00:00 → Monday 00:00; mid-weekend: from now
  return { from: toSaturday > 0 ? shift(toSaturday) : undefined, to: shift(toSaturday + 2) };
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = CATEGORIES.find((c) => c === params.get('category'));
  const when = (Object.keys(whenLabels) as When[]).find((w) => w === params.get('when')) ?? 'any';
  const [text, setText] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    // The URL changed under the input (back button, clear filters): follow it.
    setSyncedQ(q);
    if (q !== text.trim()) setText(q);
  }
  const searchTimer = useRef<number>(undefined);
  const chips = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Deep links (landing tiles) can select a chip that starts off-screen on phones.
    const active = chips.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    chips.current?.scrollTo({ left: (active?.offsetLeft ?? 0) - 16, behavior: 'smooth' });
  }, [category]);

  const query = { q: q || undefined, category, ...dateRange(when), pageSize: PAGE_SIZE };
  const list = useInfiniteEvents(query);
  const { data, isPending, isError, isPlaceholderData, isFetchNextPageError } = list;
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const filtered = Boolean(q || category || when !== 'any');

  /** Sets search params, or clears them when the value is empty. */
  const update = (changes: Record<string, string | undefined>, replace = false) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes))
          if (value) next.set(key, value);
          else next.delete(key);
        return next;
      },
      { replace },
    );
  const search = (value: string) => {
    setText(value);
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => update({ q: value.trim() }, true), 300);
  };

  return (
    <section className="page-container py-10 sm:py-14">
      <h1 className="text-3xl font-semibold sm:text-4xl">Discover events</h1>
      <p className="text-muted-foreground mt-2" aria-live="polite">
        {data ? `${total} upcoming ${total === 1 ? 'event' : 'events'}` : ' '}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <form role="search" className="relative flex-1" onSubmit={(e) => e.preventDefault()}>
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={text}
            onChange={(e) => search(e.target.value)}
            placeholder="Search events by name or topic"
            aria-label="Search events"
            className="h-11 rounded-full pl-9"
          />
        </form>
        <Select
          value={when}
          onValueChange={(value) => update({ when: value === 'any' ? undefined : value })}
        >
          <SelectTrigger aria-label="Date" className="h-11! w-full rounded-full sm:w-48">
            <CalendarDays className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(whenLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        ref={chips}
        role="group"
        aria-label="Category"
        className="relative -mx-1 mt-4 flex gap-2 overflow-x-auto p-1 [scrollbar-width:none]"
      >
        {[undefined, ...CATEGORIES].map((c?: Category) => {
          const meta = c && categoryMeta[c];
          return (
            <button
              key={c ?? 'all'}
              aria-pressed={category === c}
              onClick={() => update({ category: c })}
              className="focus-visible:ring-ring/50 group bg-card not-aria-pressed:hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition outline-none focus-visible:ring-[3px]"
            >
              {meta && (
                <meta.icon
                  aria-hidden
                  className={`size-4 ${meta.color} group-aria-pressed:text-current`}
                />
              )}
              {meta?.label ?? 'All'}
            </button>
          );
        })}
      </div>
      {isError && !isFetchNextPageError ? (
        <IllustratedState
          image="/images/empty/error.webp"
          title="We couldn't load events"
          description="Check your connection and try again."
        >
          <Button onClick={() => list.refetch()}>Try again</Button>
        </IllustratedState>
      ) : data && total === 0 ? (
        <IllustratedState
          image={filtered ? '/images/empty/no-results.webp' : '/images/empty/no-events.webp'}
          title={filtered ? 'No events match' : 'No upcoming events yet'}
          description={
            filtered
              ? 'Try another keyword, category or date range.'
              : 'New gatherings are added all the time. Check back soon.'
          }
        >
          {filtered && <Button onClick={() => setParams({})}>Clear filters</Button>}
        </IllustratedState>
      ) : (
        <div
          className={cn(
            'mt-8 grid gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {isPending
            ? Array.from({ length: 6 }, (_, i) => <EventCardSkeleton key={i} />)
            : items.map((event) => <EventCard key={event.id} event={event} />)}
          {list.isFetchingNextPage &&
            Array.from({ length: 3 }, (_, i) => <EventCardSkeleton key={`more-${i}`} />)}
        </div>
      )}
      {isFetchNextPageError && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center" role="alert">
          <p className="text-muted-foreground">We couldn't load more events.</p>
          <Button variant="outline" onClick={() => list.fetchNextPage()}>
            <RotateCw /> Try again
          </Button>
        </div>
      )}
      {data && total > 0 && !list.hasNextPage && <ListEnd total={total} />}
      <LoadMoreSentinel
        onVisible={() => list.fetchNextPage()}
        disabled={!list.hasNextPage || list.isFetching || isError}
      />
    </section>
  );
}

/** Closing state once every page is on screen. */
function ListEnd({ total }: { total: number }) {
  return (
    <div className="mt-14 flex flex-col items-center text-center">
      <div className="flex w-full items-center gap-4">
        <span className="h-px flex-1 bg-linear-to-r from-transparent to-border" />
        <img src="/images/brand/mark.webp" alt="" className="size-10" />
        <span className="h-px flex-1 bg-linear-to-l from-transparent to-border" />
      </div>
      <p className="mt-4 font-semibold">You've seen everything</p>
      <p className="text-muted-foreground mt-1 text-sm">
        {total === 1 ? 'That was the only event' : `That's all ${total} events`}. New ones are added
        all the time.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUp /> Back to top
      </Button>
    </div>
  );
}
