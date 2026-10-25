import type { Entitlement, Me } from '@gatherly/shared';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** The signed-in user, or `null` when signed out. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () =>
      apiFetch<Me>('/me').catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }),
    staleTime: 5 * 60_000,
  });
}

export function hasEntitlement(me: Me | null | undefined, entitlement: Entitlement) {
  return me?.entitlements.includes(entitlement) ?? false;
}
