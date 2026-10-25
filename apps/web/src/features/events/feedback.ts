import type { EventSummary } from '@gatherly/shared';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useMe } from '@/hooks/use-me';
import { apiFetch, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Applies `changes` to every cached copy of an event: lists, infinite pages, rails and detail. */
function patchCachedEvent(queryClient: QueryClient, id: string, changes: Partial<EventSummary>) {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    if ((node as { id?: unknown }).id === id) return { ...node, ...changes };
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, walk(value)]));
  };
  queryClient.setQueriesData({ queryKey: queryKeys.events.all }, walk);
}

/** Heart toggle, applied optimistically everywhere the event is shown. Signed out: asks to sign in. */
export function useSaveToggle(event: Pick<EventSummary, 'id' | 'saved'>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const mutation = useMutation({
    mutationFn: (save: boolean) =>
      apiFetch(`/events/${event.id}/save`, { method: save ? 'PUT' : 'DELETE' }),
    onMutate: (save) => patchCachedEvent(queryClient, event.id, { saved: save }),
    onError: (error, save) => {
      patchCachedEvent(queryClient, event.id, { saved: !save });
      toast.error(errorMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.my.saved }),
  });
  return () => {
    if (me) return mutation.mutate(!event.saved);
    toast('Sign in to save events', {
      action: { label: 'Sign in', onClick: () => navigate('/signin') },
    });
  };
}

// Hidden this visit. The API call waits for the Undo toast to close: there is no unhide.
const hidden = new Set<string>();
const listeners = new Set<() => void>();
const setHidden = (id: string, on: boolean) => {
  hidden[on ? 'add' : 'delete'](id);
  listeners.forEach((notify) => notify());
};
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

export const useIsHidden = (id: string) => useSyncExternalStore(subscribe, () => hidden.has(id));

/** "Not interested": removes the event from every list, with Undo. */
export function hideEvent(event: Pick<EventSummary, 'id' | 'title'>) {
  setHidden(event.id, true);
  let settled = false;
  const commit = () => {
    if (settled) return;
    settled = true;
    apiFetch(`/events/${event.id}/hide`, { method: 'PUT' }).catch((error: unknown) => {
      setHidden(event.id, false);
      toast.error(errorMessage(error));
    });
  };
  toast('Got it, we’ll show fewer events like this', {
    description: event.title,
    duration: 6000,
    action: {
      label: 'Undo',
      onClick: () => {
        settled = true;
        setHidden(event.id, false);
      },
    },
    onAutoClose: commit,
    onDismiss: commit,
  });
}
