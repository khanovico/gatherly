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
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;
