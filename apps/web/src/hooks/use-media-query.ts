import { useSyncExternalStore } from 'react';

/** Live `matchMedia` result, e.g. `useMediaQuery('(min-width: 640px)')`. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
