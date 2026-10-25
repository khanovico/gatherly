import type { EventStatus, EventSummary, Paginated } from '@gatherly/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CancelEventButton } from '@/features/admin/cancel-event-button';
import { toSearchParams, useDebounced } from '@/features/admin/lib';
import { Pager, SearchField } from '@/features/admin/list-controls';
import { CategoryBadge } from '@/features/events/category-badge';
import { EventDateTime } from '@/features/events/event-date-time';
import { SeatsMeter } from '@/features/events/seats-meter';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const pageSize = 10;
const statusFilters = { all: 'All statuses', published: 'Published', cancelled: 'Cancelled' };

export function EventsTab() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | EventStatus>('all');
  const [page, setPage] = useState(1);
  const query = {
    q: useDebounced(search.trim()),
    status: status === 'all' ? undefined : status,
    page,
    pageSize,
  };
  const { data, isError } = useQuery({
    queryKey: queryKeys.admin.events(query),
    queryFn: () => apiFetch<Paginated<EventSummary>>(`/admin/events?${toSearchParams(query)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          label="Search events"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onValueChange={(value: typeof status) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by status" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusFilters).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Event</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </TableBody>
        </Table>
        {data?.total === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <img src="/images/empty/no-events.webp" alt="" className="size-32" />
            <p className="font-medium">No events match these filters</p>
          </div>
        )}
        {isError && <p className="text-muted-foreground p-8 text-center">Couldn't load events.</p>}
        {!data && !isError && <Skeleton className="m-4 h-60" />}
      </Card>
      {!!data?.total && (
        <Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
      )}
    </div>
  );
}

function EventRow({ event }: { event: EventSummary }) {
  const phase =
    event.status === 'cancelled'
      ? 'Cancelled'
      : new Date(event.endsAt) < new Date()
        ? 'Past'
        : 'Upcoming';
  return (
    <TableRow>
      <TableCell className="pl-4">
        <div className="flex items-center gap-3">
          <img
            src={event.coverImage}
            alt=""
            className="h-12 w-20 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 space-y-1">
            <p title={event.title} className="max-w-64 truncate font-medium">
              {event.title}
            </p>
            <CategoryBadge category={event.category} />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <EventDateTime event={event} compact />
      </TableCell>
      <TableCell className="min-w-36">
        <SeatsMeter seats={event} />
      </TableCell>
      <TableCell>
        <Badge
          variant={
            phase === 'Cancelled' ? 'destructive' : phase === 'Past' ? 'secondary' : 'outline'
          }
        >
          {phase}
        </Badge>
      </TableCell>
      <TableCell className="pr-4 text-right whitespace-nowrap">
        <CancelEventButton event={event} />
        <Button asChild variant="ghost" size="sm">
          <Link to={`/events/${event.id}`} aria-label={`View ${event.title}`}>
            View <ArrowUpRight />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
