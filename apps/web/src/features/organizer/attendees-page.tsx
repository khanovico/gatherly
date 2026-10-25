import type { Attendee, EventDetail } from '@gatherly/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, ExternalLink, Search, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { IllustratedState } from '@/components/illustrated-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EventDateTime } from '@/features/events/event-date-time';
import { useEvent } from '@/features/events/queries';
import { SeatsMeter } from '@/features/events/seats-meter';
import { OrganizerError } from '@/features/organizer/organizer-error';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function AttendeesPage() {
  const { id = '' } = useParams();
  const event = useEvent(id);
  const attendees = useQuery({
    queryKey: queryKeys.events.attendees(id),
    queryFn: () => apiFetch<Attendee[]>(`/events/${id}/registrations`),
  });
  const error = attendees.error ?? event.error;
  const retry = () => void Promise.all([event.refetch(), attendees.refetch()]);
  if (error) return <OrganizerError error={error} onRetry={retry} />;

  return (
    <div className="page-container py-8 sm:py-10">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2.5">
        <Link to="/organizer">
          <ArrowLeft /> Dashboard
        </Link>
      </Button>
      {event.data ? <EventHeader event={event.data} /> : <Skeleton className="mt-4 h-28" />}
      {attendees.data && event.data ? (
        <AttendeeList event={event.data} attendees={attendees.data} />
      ) : (
        <Skeleton className="mt-8 h-80 rounded-xl" />
      )}
    </div>
  );
}

function EventHeader({ event }: { event: EventDetail }) {
  return (
    <header className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
      <img
        src={event.coverImage}
        alt=""
        className="h-32 w-full rounded-xl object-cover shadow-sm sm:aspect-video sm:h-auto sm:w-44"
      />
      <div className="min-w-0 flex-1">
        <p className="text-primary text-sm font-medium">Attendees</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          {event.title}{' '}
          {event.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
        </h1>
        <EventDateTime event={event} compact className="mt-2" />
        <SeatsMeter seats={event} className="mt-3 max-w-xs" />
      </div>
      <Button asChild variant="outline" className="self-start sm:self-center">
        <Link to={`/events/${event.id}`}>
          <ExternalLink /> Event page
        </Link>
      </Button>
    </header>
  );
}

function AttendeeList({ event, attendees }: { event: EventDetail; attendees: Attendee[] }) {
  const [query, setQuery] = useState('');
  const [removing, setRemoving] = useState<Attendee | null>(null);
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (attendee: Attendee) =>
      apiFetch(`/registrations/${attendee.registrationId}/cancel`, { method: 'POST' }),
    onSuccess: async (_data, attendee) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.my.events }),
      ]);
      setRemoving(null);
      toast.success(`${attendee.user.name} was removed`);
    },
  });
  const needle = query.trim().toLowerCase();
  const shown = attendees.filter((a) => `${a.user.name} ${a.email}`.toLowerCase().includes(needle));

  if (attendees.length === 0) {
    return (
      <Card className="mt-8">
        <IllustratedState
          image="/images/empty/no-registrations.webp"
          title="No one has registered yet"
          description="Share the event page to fill your seats. New registrations show up here."
        />
      </Card>
    );
  }
  return (
    <Card className="mt-8 gap-0 py-0">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <h2 className="text-lg font-semibold">
          {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}
        </h2>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            aria-label="Search attendees"
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={() => downloadCsv(event.title, attendees)}>
          <Download /> Export CSV
        </Button>
      </div>
      <ul className="divide-y">
        {shown.map((attendee) => (
          <li key={attendee.registrationId} className="flex items-center gap-3 px-4 py-3">
            <Avatar size="lg">
              <AvatarImage src={attendee.user.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-accent text-accent-foreground font-medium">
                {initials(attendee.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{attendee.user.name}</p>
              <p className="text-muted-foreground truncate text-sm">{attendee.email}</p>
            </div>
            <time
              dateTime={attendee.registeredAt}
              className="text-muted-foreground hidden text-sm sm:block"
            >
              Registered {dateTime.format(new Date(attendee.registeredAt))}
            </time>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${attendee.user.name}`}
              onClick={() => setRemoving(attendee)}
            >
              <UserMinus />
            </Button>
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <p className="text-muted-foreground p-8 text-center text-sm">
          No attendees match “{query}”.
        </p>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.user.name ?? 'attendee'}?`}
        description="Their registration is cancelled and the seat opens up for someone else."
        confirmLabel="Remove attendee"
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </Card>
  );
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

/** Leading = + - @ would run as a formula in spreadsheet apps. */
const csvCell = (value: string) => `"${value.replace(/^[=+\-@]/, "'$&").replaceAll('"', '""')}"`;

function downloadCsv(title: string, attendees: Attendee[]) {
  const rows = [
    ['Name', 'Email', 'Registered at'],
    ...attendees.map((a) => [a.user.name, a.email, a.registeredAt]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  Object.assign(document.createElement('a'), {
    href: url,
    download: `${slug}-attendees.csv`,
  }).click();
  URL.revokeObjectURL(url);
}
