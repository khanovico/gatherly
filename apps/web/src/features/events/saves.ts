import type { EventSummary, Paginated } from '@gatherly/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

/** Saves (`saved: true`) or unsaves an event; every list showing the saved state refetches. */
export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      apiFetch<void>(`/events/${id}/save`, { method: saved ? 'PUT' : 'DELETE' }),
    onSuccess: () =>
      Promise.all(
        [queryKeys.my.saved, queryKeys.events.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}
