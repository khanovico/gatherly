import { z } from 'zod';
import { isoDateTime } from './common';
import { Category, EventFormat, EventStatus, RegistrationStatus } from './enums';
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

/** Rules that span fields. Each applies only when its fields are present, so it also fits patches. */
const checkEventRules = (event: Partial<z.infer<typeof eventFields>>, ctx: z.RefinementCtx) => {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message });
  const starts = event.startsAt ? Date.parse(event.startsAt) : undefined;
  if (starts !== undefined && starts <= Date.now()) issue('startsAt', 'Must be in the future');
  if (starts !== undefined && event.endsAt && Date.parse(event.endsAt) <= starts)
    issue('endsAt', 'Must be after the start');
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

export const eventListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: Category.optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
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
});
export type EventSummary = z.infer<typeof eventSummary>;

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

export const myRegistration = registration.extend({ event: eventSummary });
export type MyRegistration = z.infer<typeof myRegistration>;

/** `GET /me/registrations`: active registrations; upcoming soonest first, past most recent first. */
export const myRegistrations = z.object({
  upcoming: z.array(myRegistration),
  past: z.array(myRegistration),
});
export type MyRegistrations = z.infer<typeof myRegistrations>;

export const attendee = z.object({
  registrationId: z.uuid(),
  user: userSummary,
  email: z.email(),
  status: RegistrationStatus,
  registeredAt: isoDateTime,
});
export type Attendee = z.infer<typeof attendee>;
