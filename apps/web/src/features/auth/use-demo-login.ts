import type { Me, Persona, UserSummary } from '@gatherly/shared';
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
