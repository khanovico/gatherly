import type { Profile, PublicProfile, UpdateProfileInput } from '@gatherly/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** The signed-in user's private preferences (defaults until onboarding is done). */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.my.profile,
    queryFn: () => apiFetch<Profile>('/me/profile'),
  });
}

/** Saves preferences, then refetches them, `me` (onboarding state) and every event list. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<unknown>('/me/profile', { method: 'PUT', body: input }),
    onSuccess: () =>
      Promise.all(
        [queryKeys.me, queryKeys.my.profile, queryKeys.events.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/** Anyone's public profile with their upcoming hosted and attended events. */
export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => apiFetch<PublicProfile>(`/users/${id}`),
  });
}
