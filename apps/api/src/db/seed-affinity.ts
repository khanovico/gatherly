import { NEIGHBORHOODS, type TimeSlot } from '@gatherly/shared';
import { distanceKm } from '../ranking/geo';
import { timeOfWeek } from '../ranking/rule-based';
import type { events } from './schema';
import type { SeedMember } from './seed-members';
import type { Random } from './seed-random';

type Profile = NonNullable<SeedMember['profile']>;
export type AffinityEvent = Pick<
  typeof events.$inferSelect,
  'category' | 'format' | 'tags' | 'lat' | 'lng' | 'startsAt' | 'timezone'
>;

// Formatting dates in a time zone is slow; each event is scored once per member.
const slots = new WeakMap<AffinityEvent, TimeSlot>();
const slotOf = (event: AffinityEvent) => {
  const slot = slots.get(event) ?? timeOfWeek(event.startsAt, event.timezone).slot;
  slots.set(event, slot);
  return slot;
};

const homeOf = (profile: Profile) =>
  profile.homeLat != null && profile.homeLng != null
    ? { lat: profile.homeLat, lng: profile.homeLng }
    : NEIGHBORHOODS.find((n) => n.id === profile.neighborhood)!;

/**
 * How likely a member is to go: interests, tags, travel distance within their radius and time
 * slot, plus noise so crowds overlap without being identical. -Infinity for a format they skip.
 */
export const affinity = (profile: Profile | null, event: AffinityEvent, random: Random) => {
  let score = random.next() * 1.5;
  if (!profile) return score;
  if (!profile.formats.includes(event.format)) return -Infinity;
  if (profile.interests.includes(event.category)) score += 3;
  score += event.tags.filter((t) => profile.tags.includes(t)).length;
  if (profile.timeSlots.includes(slotOf(event))) score += 1;
  if (event.lat !== null && event.lng !== null) {
    const km = distanceKm(homeOf(profile), { lat: event.lat, lng: event.lng });
    score += km <= profile.radiusKm ? 2 * (1 - km / profile.radiusKm) : -2;
  }
  return score;
};
