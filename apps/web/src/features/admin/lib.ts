/** `?key=value` for every defined, non-empty value. */
export const toSearchParams = (query: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined || value === '' ? [] : [[key, String(value)]],
    ),
  );
