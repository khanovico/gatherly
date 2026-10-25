import type { Interaction } from '@gatherly/shared';
import { useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';

/** Where an event was shown, echoed on every interaction with it (training data for ranking). */
export type TrackingContext = Omit<Interaction, 'type' | 'eventId'>;

const MAX_BATCH = 50;
const FLUSH_MS = 3000;
let queue: Interaction[] = [];
let timer: number | undefined;

/** Random id kept on this device so signed-out activity can be stitched to an account later. */
let anonymousId: string | undefined;
function getAnonymousId() {
  if (anonymousId) return anonymousId;
  try {
    anonymousId = localStorage.getItem('gatherly.anonymous-id') ?? crypto.randomUUID();
    localStorage.setItem('gatherly.anonymous-id', anonymousId);
  } catch {
    anonymousId = crypto.randomUUID(); // storage blocked: one id per page load
  }
  return anonymousId;
}

/** Best effort: a lost batch is not worth a retry or an error toast. */
function flush() {
  window.clearTimeout(timer);
  timer = undefined;
  while (queue.length) {
    const interactions = queue.slice(0, MAX_BATCH);
    queue = queue.slice(MAX_BATCH);
    // keepalive lets the last batch finish while the tab closes.
    apiFetch('/interactions', {
      method: 'POST',
      body: { anonymousId: getAnonymousId(), interactions },
      keepalive: true,
    }).catch(() => {});
  }
}

addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.hidden && flush());

export function track(interaction: Interaction) {
  queue.push(interaction);
  if (queue.length >= MAX_BATCH) flush();
  else timer ??= window.setTimeout(flush, FLUSH_MS);
}

// One impression per event per served list (surface + requestId), however often it scrolls by.
const seen = new Set<string>();

/**
 * Logs an impression once the element has been at least half visible for a second. Returns the
 * ref to attach; does nothing without a context.
 */
export function useImpression<T extends Element>(eventId: string, context?: TrackingContext) {
  const ref = useRef<T>(null);
  const latest = useRef(context);
  useEffect(() => {
    latest.current = context;
  });
  const key = context && `${context.surface}|${context.requestId}|${eventId}`;
  useEffect(() => {
    const element = ref.current;
    if (!key || !element || seen.has(key)) return;
    let dwell: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(dwell);
        if (!entry?.isIntersecting) return;
        dwell = window.setTimeout(() => {
          seen.add(key);
          observer.disconnect();
          track({ ...latest.current!, eventId, type: 'impression' });
        }, 1000);
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(dwell);
    };
  }, [key, eventId]);
  return ref;
}
