import { useEffect, useRef } from 'react';

/**
 * Invisible marker placed after a list: calls `onVisible` when it scrolls within `margin` of the
 * viewport. The observer is rebuilt whenever `disabled` flips, so a marker that is still on
 * screen after a page loads (tall screens, short pages) asks for the next one straight away.
 */
export function LoadMoreSentinel({
  onVisible,
  disabled,
  margin = '600px',
}: {
  onVisible: () => void;
  disabled: boolean;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onVisible);
  useEffect(() => {
    callback.current = onVisible;
  });
  useEffect(() => {
    if (disabled || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && callback.current(),
      { rootMargin: margin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [disabled, margin]);
  return <div ref={ref} aria-hidden className="h-px" />;
}
