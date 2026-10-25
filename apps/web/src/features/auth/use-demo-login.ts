import type { Me, Persona } from '@gatherly/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { personaInfo } from '@/features/auth/personas';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Signs in as a demo persona, then opens `next` or the persona's home page. */
export function useDemoLogin(next?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (persona: Persona) =>
      apiFetch<Me>('/auth/demo-login', { method: 'POST', body: { persona } }),
    onSuccess: (me, persona) => {
      queryClient.setQueryData(queryKeys.me, me);
      // Everything else was fetched as someone else (or nobody).
      void queryClient.resetQueries({
        predicate: ({ queryKey }) => queryKey[0] !== queryKeys.me[0],
      });
      navigate(next ?? personaInfo[persona].home);
      toast.success(`Signed in as ${me.user.name}`);
    },
  });
}
