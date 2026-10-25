import type { EventListQuery } from '@gatherly/shared';

/** All query keys. Invalidate by prefix, e.g. `queryKeys.events.all` after any event change. */
export const queryKeys = {
  me: ['me'] as const,
  personas: ['auth', 'personas'] as const,
  events: {
    all: ['events'] as const,
    list: (query: Partial<EventListQuery>) => ['events', 'list', query] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
    attendees: (id: string) => ['events', 'detail', id, 'attendees'] as const,
  },
  my: {
    registrations: ['my', 'registrations'] as const,
    events: ['my', 'events'] as const,
  },
  admin: {
    all: ['admin'] as const,
    stats: ['admin', 'stats'] as const,
    users: (query: object) => ['admin', 'users', query] as const,
    events: (query: object) => ['admin', 'events', query] as const,
  },
  billing: {
    plans: ['billing', 'plans'] as const,
    subscription: ['billing', 'subscription'] as const,
  },
};
