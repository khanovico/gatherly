import type { EventDetail, EventListQuery, EventSummary, Paginated } from '@gatherly/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Published upcoming events, soonest first. Keeps the previous page on screen while filters change. */
export function useEvents(query: Partial<EventListQuery>) {
  const params = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined || value === '' ? [] : [[key, String(value)]],
    ),
  );
  return useQuery({
    queryKey: queryKeys.events.list(query),
    queryFn: () => apiFetch<Paginated<EventSummary>>(`/events?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => apiFetch<EventDetail>(`/events/${id}`),
  });
}
