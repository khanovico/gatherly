import { z } from 'zod';
import { isoDateTime, pageQuery, paginated } from './common';
import {
  Category,
  EventFormat,
  EventStatus,
  RadiusKm,
  ReasonKind,
  RegistrationStatus,
  SortOrder,
} from './enums';
import { NeighborhoodId, locationQuery } from './places';
import { userSummary } from './users';

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return /^[A-Za-z]/.test(tz); // rejects raw offsets such as "+05:00"
  } catch {
    return false;
  }
};

const eventFields = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(1).max(280),
  description: z.string().trim().max(5000),
  category: Category,
  format: EventFormat,
  venueName: z.string().trim().max(120).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  onlineUrl: z.url({ protocol: /^https?$/ }).optional(),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  timezone: z.string().refine(isTimeZone, 'Must be an IANA time zone, e.g. America/New_York'),
  capacity: z.int().min(1).max(10_000),
  /** Only 0 is accepted for now; the API rejects more with `PAID_TICKETS_UNAVAILABLE`. */
  priceCents: z.int().min(0),
  currency: z.string().regex(/^[A-Z]{3}$/, 'ISO 4217 code, e.g. USD'),
  coverImage: z.string().startsWith('/images/').optional(),
});

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LEAD_MS = 2 * 365 * DAY_MS;
const MAX_DURATION_MS = 7 * DAY_MS;

/** Rules that span fields. Each applies only when its fields are present, so it also fits patches. */
const checkEventRules = (event: Partial<z.infer<typeof eventFields>>, ctx: z.RefinementCtx) => {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message });
  const starts = event.startsAt ? Date.parse(event.startsAt) : undefined;
  const ends = event.endsAt ? Date.parse(event.endsAt) : undefined;
  if (starts !== undefined && starts <= Date.now()) issue('startsAt', 'Must be in the future');
  if (starts !== undefined && starts > Date.now() + MAX_LEAD_MS)
    issue('startsAt', 'Must be within the next 2 years');
  if (starts !== undefined && ends !== undefined) {
    if (ends <= starts) issue('endsAt', 'Must be after the start');
    else if (ends - starts > MAX_DURATION_MS) issue('endsAt', 'Events can last at most 7 days');
  }
  if (event.format === 'online' && !event.onlineUrl)
    issue('onlineUrl', 'Required for online events');
  if (event.format === 'in_person') {
    if (!event.venueName) issue('venueName', 'Required for in-person events');
    if (!event.city) issue('city', 'Required for in-person events');
  }
};

export const createEventInput = eventFields
  .extend({
    priceCents: eventFields.shape.priceCents.default(0),
    currency: eventFields.shape.currency.default('USD'),
  })
  .superRefine(checkEventRules);
export type CreateEventInput = z.infer<typeof createEventInput>;

/** Patch body. The API re-checks the merged event (e.g. a new `endsAt` against the stored `startsAt`). */
export const updateEventInput = eventFields.partial().superRefine(checkEventRules);
export type UpdateEventInput = z.infer<typeof updateEventInput>;

/** Lowercase words joined by hyphens, e.g. `jazz`, `machine-learning`. */
export const tag = z
  .string()
  .trim()
  .toLowerCase()
  .max(30)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase words joined by hyphens');

/**
 * `GET /events`. `sort` defaults to `for_you` when signed in and onboarded, else `soonest`.
 * `tags` is comma-separated on the wire (`tags=jazz,live-music`). `radiusKm` needs a location.
 */
export const eventListQuery = locationQuery.extend({
  q: z.string().trim().max(100).optional(),
  category: Category.optional(),
  tags: z
    .string()
    .transform((s) => s.split(','))
    .pipe(z.array(tag).max(10))
    .optional(),
  format: EventFormat.optional(),
  freeOnly: z.stringbool().optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  sort: SortOrder.optional(),
  radiusKm: z.coerce.number().pipe(RadiusKm).optional(),
  ...pageQuery.shape,
});
export type EventListQuery = z.infer<typeof eventListQuery>;

export const eventSummary = z.object({
  id: z.uuid(),
  organizerId: z.uuid(),
  title: z.string(),
  summary: z.string(),
  category: Category,
  format: EventFormat,
  venueName: z.string().nullable(),
  city: z.string().nullable(),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  timezone: z.string(),
  capacity: z.int(),
  registeredCount: z.int(),
  priceCents: z.int(),
  currency: z.string(),
  status: EventStatus,
  coverImage: z.string(),
  neighborhood: NeighborhoodId.nullable().optional(),
  /** The signed-in viewer saved this event. Absent when signed out. */
  saved: z.boolean().optional(),
  /** Why a ranked result was shown, strongest first. */
  reasons: z.array(z.object({ kind: ReasonKind, label: z.string() })).optional(),
  /** From the viewer's location; absent for online events or when the location is unknown. */
  distanceKm: z.number().min(0).optional(),
});
export type EventSummary = z.infer<typeof eventSummary>;

/** `GET /events`: a page, plus what ordered it. Clients echo both on interactions. */
export const eventFeed = paginated(eventSummary).extend({
  /** `for_you` ranks at most 500 matches; true when it hit that cap, so `total` is a floor. */
  totalCapped: z.boolean().optional(),
  rankerVersion: z.string().optional(),
  requestId: z.string().optional(),
});
export type EventFeed = z.infer<typeof eventFeed>;

export const registration = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  userId: z.uuid(),
  status: RegistrationStatus,
  createdAt: isoDateTime,
  cancelledAt: isoDateTime.nullable(),
});
export type Registration = z.infer<typeof registration>;

export const eventDetail = eventSummary.extend({
  description: z.string(),
  address: z.string().nullable(),
  onlineUrl: z.string().nullable(),
  organizer: userSummary,
  /** The signed-in viewer's active registration, or null (also when signed out). */
  viewerRegistration: registration.nullable(),
});
export type EventDetail = z.infer<typeof eventDetail>;

export const myEventsQuery = pageQuery.extend({
  when: z.enum(['upcoming', 'past', 'cancelled']).default('upcoming'),
});
export type MyEventsQuery = z.infer<typeof myEventsQuery>;

/**
 * `GET /me/events?when&page&pageSize`: one page of the organizer's events; upcoming soonest first,
 * past most recent first. `stats` covers all of them: tab sizes, registrations across published
 * events, and the mean fill rate of upcoming ones (null with none).
 */
export const myEvents = paginated(eventSummary).extend({
  stats: z.object({
    upcoming: z.int().min(0),
    past: z.int().min(0),
    cancelled: z.int().min(0),
    registrations: z.int().min(0),
    fillRate: z.number().min(0).nullable(),
  }),
});
export type MyEvents = z.infer<typeof myEvents>;

export const myRegistration = registration.extend({ event: eventSummary });
export type MyRegistration = z.infer<typeof myRegistration>;

export const myRegistrationsQuery = pageQuery.extend({
  when: z.enum(['upcoming', 'past']).default('upcoming'),
});
export type MyRegistrationsQuery = z.infer<typeof myRegistrationsQuery>;

/**
 * `GET /me/registrations?when&page&pageSize`: one page of active registrations; upcoming soonest
 * first, past most recent first. `counts` sizes both tabs.
 */
export const myRegistrations = paginated(myRegistration).extend({
  counts: z.object({ upcoming: z.int().min(0), past: z.int().min(0) }),
});
export type MyRegistrations = z.infer<typeof myRegistrations>;

export const attendee = z.object({
  registrationId: z.uuid(),
  user: userSummary,
  /** Masked (`j***@example.com`) for real accounts on the public demo. */
  email: z.string(),
  status: RegistrationStatus,
  registeredAt: isoDateTime,
});
export type Attendee = z.infer<typeof attendee>;
