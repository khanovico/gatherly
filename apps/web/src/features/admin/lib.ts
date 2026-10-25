import { useEffect, useState } from 'react';

/** `?key=value` for every defined, non-empty value. */
export const toSearchParams = (query: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined || value === '' ? [] : [[key, String(value)]],
    ),
  );

/** `value`, once it has stopped changing for `delay` ms. */
export function useDebounced<T>(value: T, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
