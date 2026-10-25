import type { Me, Persona, SignupInput, UserSummary } from '@gatherly/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { personaInfo } from '@/features/auth/personas';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export type PersonaCard = { persona: Persona; user: UserSummary };

export function usePersonas() {
  return useQuery({
    queryKey: queryKeys.personas,
    queryFn: () => apiFetch<PersonaCard[]>('/auth/personas'),
    staleTime: Infinity,
  });
}

/** Swaps the cached identity; everything else was fetched as someone else (or nobody). */
function switchIdentity(queryClient: QueryClient, me: Me | null) {
  queryClient.setQueryData(queryKeys.me, me);
  void queryClient.resetQueries({ predicate: ({ queryKey }) => queryKey[0] !== queryKeys.me[0] });
}

/** Signs in as a demo persona, then opens `next` or the persona's home page. */
export function useDemoLogin(next?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (persona: Persona) =>
      apiFetch<Me>('/auth/demo-login', { method: 'POST', body: { persona } }),
    onSuccess: (me, persona) => {
      navigate(next ?? personaInfo[persona].home);
      switchIdentity(queryClient, me);
      toast.success(`Signed in as ${me.user.name}`);
    },
  });
}

/**
 * Email and password sign-in or sign-up. Anyone not onboarded yet (every new account) goes to
 * onboarding. `onError` replaces the global toast so forms can show errors inline.
 */
export function usePasswordAuth(
  mode: 'signin' | 'signup',
  next?: string,
  onError?: (error: unknown) => void,
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    // Sign-in ignores `name`.
    mutationFn: (body: SignupInput) => apiFetch<Me>(`/auth/${mode}`, { method: 'POST', body }),
    onSuccess: (me) => {
      navigate(me.onboardingPending ? '/onboarding' : (next ?? '/events'));
      switchIdentity(queryClient, me);
      const greeting = mode === 'signup' ? 'Welcome to Gatherly' : 'Welcome back';
      toast.success(`${greeting}, ${me.user.name.split(' ')[0]}!`);
    },
    onError,
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      navigate('/');
      switchIdentity(queryClient, null);
      toast.success('Signed out. See you soon!');
    },
  });
}
