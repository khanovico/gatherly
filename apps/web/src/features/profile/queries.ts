import type { Profile, UpdateProfileInput } from '@gatherly/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** The signed-in user's private preferences (defaults until onboarding is done). */
export function useProfile({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.my.profile,
    queryFn: () => apiFetch<Profile>('/me/profile'),
    enabled,
  });
}

/** Saves preferences, then refetches them and every event list (rankings depend on them). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<unknown>('/me/profile', { method: 'PUT', body: input }),
    onSuccess: () =>
      Promise.all(
        [queryKeys.my.profile, queryKeys.events.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}
