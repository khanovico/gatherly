import type { Plan, Subscription } from '@gatherly/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.billing.plans,
    queryFn: () => apiFetch<Plan[]>('/billing/plans'),
    staleTime: Infinity,
  });
}

/** `$19` or `$19.50`. Prices are USD for now. */
export const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);

/** `null` when the user never subscribed, i.e. is on Free. */
export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription,
    queryFn: () => apiFetch<Subscription | null>('/billing/subscription'),
  });
}
