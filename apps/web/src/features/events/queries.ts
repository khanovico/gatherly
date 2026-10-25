import type { EventDetail, EventListQuery, EventSummary, Paginated } from '@gatherly/shared';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const fetchEvents = (query: Partial<EventListQuery>) => {
  const params = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined || value === '' ? [] : [[key, String(value)]],
    ),
  );
  return apiFetch<Paginated<EventSummary>>(`/events?${params}`);
};

/** Published upcoming events, soonest first. Keeps the previous page on screen while filters change. */
export function useEvents(query: Partial<EventListQuery>) {
  return useQuery({
    queryKey: queryKeys.events.list(query),
    queryFn: () => fetchEvents(query),
    placeholderData: keepPreviousData,
  });
}

/** Same list, one page at a time for infinite scrolling: `fetchNextPage` until `hasNextPage` is false. */
export function useInfiniteEvents(query: Omit<Partial<EventListQuery>, 'page'>) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.events.list(query), 'infinite'],
    queryFn: ({ pageParam }) => fetchEvents({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => apiFetch<EventDetail>(`/events/${id}`),
  });
}
