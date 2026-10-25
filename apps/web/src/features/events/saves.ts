import type { EventSummary, Paginated } from '@gatherly/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** The viewer's saved events, most recently saved first, a page at a time. */
export function useSavedEvents() {
  return useInfiniteQuery({
    queryKey: queryKeys.my.saved,
    queryFn: ({ pageParam }) =>
      apiFetch<Paginated<EventSummary>>(`/me/saved?page=${pageParam}&pageSize=24`),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
}
