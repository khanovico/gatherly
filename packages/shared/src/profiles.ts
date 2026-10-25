import { z } from 'zod';
import { isoDateTime } from './common';
import { CATEGORIES, Category, EventFormat, RadiusKm, TIME_SLOTS, TimeSlot } from './enums';
import { eventSummary, tag } from './events';
import { NeighborhoodId, latitude, longitude } from './places';
import { userSummary } from './users';

const uniqueList = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(item)
    .max(max)
    .refine((list) => new Set(list).size === list.length, 'Must not repeat values');

const profileFields = z.object({
  bio: z.string().trim().max(280).nullable(),
  interests: uniqueList(Category, CATEGORIES.length),
  tags: uniqueList(tag, 20),
  neighborhood: NeighborhoodId.nullable(),
  /** Browser geolocation. When set, distances use it instead of `neighborhood`. */
  homeLat: latitude.nullable(),
  homeLng: longitude.nullable(),
  radiusKm: RadiusKm,
  formats: uniqueList(EventFormat, 2),
  timeSlots: uniqueList(TimeSlot, TIME_SLOTS.length),
});

/**
 * `GET|PUT /me/profile`: private preferences. A user without a stored profile gets the defaults:
 * no interests or tags, no location, radius 10, every format and time slot, not onboarded.
 */
export const profile = profileFields.extend({ onboardedAt: isoDateTime.nullable() });
export type Profile = z.infer<typeof profile>;

/** Partial update. `onboarded: true` stamps `onboardedAt` (the wizard was finished or skipped). */
export const updateProfileInput = profileFields
  .extend({
    interests: profileFields.shape.interests.min(3),
    onboarded: z.literal(true),
  })
  .partial()
  .refine((p) => (p.homeLat === undefined) === (p.homeLng === undefined), {
    path: ['homeLng'],
    message: 'Send homeLat and homeLng together',
  });
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

/** `GET /users/:id`. `hosting` and `attending` hold upcoming events, soonest first. */
export const publicProfile = userSummary.extend({
  bio: z.string().nullable(),
  interests: z.array(Category),
  memberSince: isoDateTime,
  hosting: z.array(eventSummary),
  attending: z.array(eventSummary),
});
export type PublicProfile = z.infer<typeof publicProfile>;
