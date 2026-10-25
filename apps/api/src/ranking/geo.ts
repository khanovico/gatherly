import { NEIGHBORHOODS, type NeighborhoodId } from '@gatherly/shared';
import type { userProfiles } from '../db/schema';

export type Point = { lat: number; lng: number };
export type ViewerProfile = typeof userProfiles.$inferSelect;

export const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle (haversine) distance. */
export const distanceKm = (a: Point, b: Point) => {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

const neighborhoodPoint = (id: NeighborhoodId): Point => NEIGHBORHOODS.find((n) => n.id === id)!;

/** Where distances are measured from: the query's location, else the viewer's home. */
export const resolveOrigin = (
  query: { near?: NeighborhoodId; lat?: number; lng?: number },
  profile: ViewerProfile | null,
): Point | null => {
  if (query.near) return neighborhoodPoint(query.near);
  if (query.lat !== undefined && query.lng !== undefined) return { lat: query.lat, lng: query.lng };
  if (profile?.homeLat != null && profile.homeLng != null) {
    return { lat: profile.homeLat, lng: profile.homeLng };
  }
  return profile?.neighborhood ? neighborhoodPoint(profile.neighborhood) : null;
};
