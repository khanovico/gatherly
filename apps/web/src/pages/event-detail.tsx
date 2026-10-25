import type { EventDetail } from '@gatherly/shared';
import { ArrowLeft, CalendarDays, Globe, MapPin, Pencil, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryBadge } from '@/features/events/category-badge';
import { EventDateTime } from '@/features/events/event-date-time';
import { useEvent } from '@/features/events/queries';
import { RegistrationPanel } from '@/features/events/registration-panel';
import { useMe } from '@/hooks/use-me';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export function Component() {
  const { id = '' } = useParams();
  const { data: event, error, refetch } = useEvent(id);
  const { data: me } = useMe();

  if (error) {
    const missing = error instanceof ApiError && [400, 404].includes(error.status);
    return (
      <IllustratedState
        as="h1"
        image={missing ? '/images/misc/404.webp' : '/images/empty/error.webp'}
        title={missing ? 'Event not found' : "We couldn't load this event"}
        description={
          missing
            ? 'It may have been removed, or the link is mistyped.'
            : 'Check your connection and try again.'
        }
      >
        {!missing && <Button onClick={() => refetch()}>Try again</Button>}
        <Button asChild variant={missing ? 'default' : 'outline'}>
          <Link to="/events">Browse events</Link>
        </Button>
      </IllustratedState>
    );
  }
  if (!event) return <DetailSkeleton />;

  const canManage = me?.user.id === event.organizer.id || me?.user.role === 'admin';
  const cancelled = event.status === 'cancelled';
  return (
    <article className="page-container pt-6 pb-32 lg:pb-20">
      <title>{`${event.title} · Gatherly`}</title>
      <Link
        to="/events"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft aria-hidden className="size-4" /> All events
      </Link>
      <div className="bg-muted relative mt-4 aspect-video overflow-hidden rounded-3xl shadow-sm sm:aspect-[21/9]">
        <img
          src={event.coverImage}
          alt=""
          className={cn('size-full object-cover', cancelled && 'grayscale')}
        />
        {cancelled && (
          <span className="bg-destructive absolute top-4 left-4 rounded-full px-3 py-1 text-sm font-semibold text-white">
            Cancelled
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-10">
          <header className="space-y-4">
            <CategoryBadge category={event.category} />
            <h1 className="text-3xl font-semibold sm:text-4xl">{event.title}</h1>
            <p className="text-muted-foreground text-lg">{event.summary}</p>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/organizer/events/${event.id}/edit`}>
                    <Pencil /> Edit event
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/organizer/events/${event.id}/attendees`}>
                    <Users /> Attendees
                  </Link>
                </Button>
              </div>
            )}
          </header>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <InfoTile icon={CalendarDays} label="When">
              <EventDateTime event={event} />
            </InfoTile>
            <InfoTile icon={event.format === 'online' ? Globe : MapPin} label="Where">
              <Where event={event} reveal={Boolean(event.viewerRegistration) || canManage} />
            </InfoTile>
          </dl>

          <section>
            <h2 className="text-xl font-semibold">About this event</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed whitespace-pre-line">
              {event.description || event.summary}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Your host</h2>
            <div className="bg-card hover:border-primary/40 relative mt-4 flex items-center gap-4 rounded-2xl border p-5 transition-colors">
              <Avatar className="size-14">
                {event.organizer.avatarUrl && (
                  <AvatarImage src={event.organizer.avatarUrl} alt="" />
                )}
                <AvatarFallback className="bg-accent text-accent-foreground text-lg font-semibold">
                  {event.organizer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link
                  to={`/u/${event.organizer.id}`}
                  className="font-semibold after:absolute after:inset-0 hover:underline"
                >
                  {event.organizer.name}
                </Link>
                <p className="text-muted-foreground text-sm">Organizer on Gatherly</p>
              </div>
            </div>
          </section>
        </div>
        <RegistrationPanel event={event} />
      </div>
    </article>
  );
}

function InfoTile(props: { icon: typeof MapPin; label: string; children: ReactNode }) {
  return (
    <div className="bg-card flex gap-4 rounded-2xl border p-5">
      <div className="bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-xl">
        <props.icon aria-hidden className="size-5" />
      </div>
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {props.label}
        </dt>
        <dd className="mt-1">{props.children}</dd>
      </div>
    </div>
  );
}

/** Venue and address, or the join link for online events (shown once the viewer has a seat). */
function Where({ event, reveal }: { event: EventDetail; reveal: boolean }) {
  if (event.format === 'in_person')
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{event.venueName}</span>
        <span className="text-muted-foreground text-sm">
          {[event.address, event.city].filter(Boolean).join(', ')}
        </span>
      </div>
    );
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">Online event</span>
      {reveal && event.onlineUrl ? (
        <a
          href={event.onlineUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary truncate text-sm hover:underline"
        >
          Join link
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">Join link unlocks after you register</span>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="page-container pt-6 pb-20" aria-busy aria-label="Loading event">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 aspect-video rounded-3xl sm:aspect-[21/9]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="hidden h-64 rounded-2xl lg:block" />
      </div>
    </div>
  );
}
