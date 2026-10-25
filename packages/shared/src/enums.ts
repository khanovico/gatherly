import { z } from 'zod';

export const CATEGORIES = [
  'tech',
  'design',
  'business',
  'wellness',
  'arts',
  'outdoors',
  'food',
  'community',
] as const;
export const Category = z.enum(CATEGORIES);
export type Category = z.infer<typeof Category>;

export const EventFormat = z.enum(['in_person', 'online']);
export type EventFormat = z.infer<typeof EventFormat>;

export const EventStatus = z.enum(['published', 'cancelled']);
export type EventStatus = z.infer<typeof EventStatus>;

export const RegistrationStatus = z.enum(['pending_payment', 'confirmed', 'cancelled', 'refunded']);
export type RegistrationStatus = z.infer<typeof RegistrationStatus>;

export const Role = z.enum(['member', 'admin']);
export type Role = z.infer<typeof Role>;

export const UserStatus = z.enum(['active', 'suspended']);
export type UserStatus = z.infer<typeof UserStatus>;

export const PlanCode = z.enum(['free', 'premium']);
export type PlanCode = z.infer<typeof PlanCode>;

export const Entitlement = z.enum(['events:create', 'tickets:sell']);
export type Entitlement = z.infer<typeof Entitlement>;

export const Persona = z.enum(['organizer', 'attendee', 'admin']);
export type Persona = z.infer<typeof Persona>;

export const TIME_SLOTS = ['weekday_daytime', 'weeknights', 'weekends'] as const;
export const TimeSlot = z.enum(TIME_SLOTS);
export type TimeSlot = z.infer<typeof TimeSlot>;

/** Travel radius choices in km. */
export const RADIUS_OPTIONS = [2, 5, 10, 25] as const;
export const RadiusKm = z.literal(RADIUS_OPTIONS);
export type RadiusKm = z.infer<typeof RadiusKm>;

export const SortOrder = z.enum(['for_you', 'soonest', 'nearest', 'popular']);
export type SortOrder = z.infer<typeof SortOrder>;

export const InteractionType = z.enum([
  'impression',
  'click',
  'view',
  'save',
  'unsave',
  'hide',
  'register',
  'cancel',
]);
export type InteractionType = z.infer<typeof InteractionType>;

/** Where an interaction happened. Rails show on both the landing page and Discover. */
export const Surface = z.enum([
  'discover_grid',
  'rail_for_you',
  'rail_near_you',
  'rail_popular',
  'event_detail',
  'public_profile',
  'saved',
  'my_tickets',
]);
export type Surface = z.infer<typeof Surface>;

/** Why a ranked event was shown; the web picks an icon per kind. */
export const ReasonKind = z.enum(['interest', 'tag', 'distance', 'time', 'popular', 'new']);
export type ReasonKind = z.infer<typeof ReasonKind>;

export const ErrorCode = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'ENTITLEMENT_REQUIRED',
  'ACCOUNT_SUSPENDED',
  'NOT_FOUND',
  'EVENT_FULL',
  'EVENT_STARTED',
  'EVENT_CANCELLED',
  'ALREADY_REGISTERED',
  'NOT_REGISTERED',
  'CAPACITY_BELOW_REGISTERED',
  'PAID_TICKETS_UNAVAILABLE',
  'PROTECTED_DEMO_ACCOUNT',
  'COMING_SOON',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'RATE_LIMITED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;
