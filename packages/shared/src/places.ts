import { z } from 'zod';

export const Borough = z.enum(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);
export type Borough = z.infer<typeof Borough>;

/** Demo city New York: fixed neighborhoods with approximate centers. No geocoding. */
// prettier-ignore
export const NEIGHBORHOODS = [
  { id: 'financial-district', name: 'Financial District', borough: 'Manhattan', lat: 40.7075, lng: -74.0113 },
  { id: 'tribeca', name: 'Tribeca', borough: 'Manhattan', lat: 40.7163, lng: -74.0086 },
  { id: 'soho', name: 'SoHo', borough: 'Manhattan', lat: 40.7233, lng: -74.003 },
  { id: 'lower-east-side', name: 'Lower East Side', borough: 'Manhattan', lat: 40.715, lng: -73.9843 },
  { id: 'east-village', name: 'East Village', borough: 'Manhattan', lat: 40.7265, lng: -73.9815 },
  { id: 'west-village', name: 'West Village', borough: 'Manhattan', lat: 40.7358, lng: -74.0036 },
  { id: 'chelsea', name: 'Chelsea', borough: 'Manhattan', lat: 40.7465, lng: -74.0014 },
  { id: 'flatiron', name: 'Flatiron', borough: 'Manhattan', lat: 40.7411, lng: -73.9897 },
  { id: 'midtown', name: 'Midtown', borough: 'Manhattan', lat: 40.7549, lng: -73.984 },
  { id: 'upper-west-side', name: 'Upper West Side', borough: 'Manhattan', lat: 40.787, lng: -73.9754 },
  { id: 'upper-east-side', name: 'Upper East Side', borough: 'Manhattan', lat: 40.7736, lng: -73.9566 },
  { id: 'harlem', name: 'Harlem', borough: 'Manhattan', lat: 40.8116, lng: -73.9465 },
  { id: 'williamsburg', name: 'Williamsburg', borough: 'Brooklyn', lat: 40.7081, lng: -73.9571 },
  { id: 'greenpoint', name: 'Greenpoint', borough: 'Brooklyn', lat: 40.7304, lng: -73.9515 },
  { id: 'bushwick', name: 'Bushwick', borough: 'Brooklyn', lat: 40.6944, lng: -73.9213 },
  { id: 'dumbo', name: 'DUMBO', borough: 'Brooklyn', lat: 40.7033, lng: -73.9881 },
  { id: 'brooklyn-heights', name: 'Brooklyn Heights', borough: 'Brooklyn', lat: 40.696, lng: -73.9933 },
  { id: 'fort-greene', name: 'Fort Greene', borough: 'Brooklyn', lat: 40.6889, lng: -73.9766 },
  { id: 'park-slope', name: 'Park Slope', borough: 'Brooklyn', lat: 40.671, lng: -73.9814 },
  { id: 'crown-heights', name: 'Crown Heights', borough: 'Brooklyn', lat: 40.6694, lng: -73.9422 },
  { id: 'long-island-city', name: 'Long Island City', borough: 'Queens', lat: 40.7447, lng: -73.9485 },
  { id: 'astoria', name: 'Astoria', borough: 'Queens', lat: 40.7644, lng: -73.9235 },
  { id: 'jackson-heights', name: 'Jackson Heights', borough: 'Queens', lat: 40.7557, lng: -73.8831 },
  { id: 'flushing', name: 'Flushing', borough: 'Queens', lat: 40.7675, lng: -73.8331 },
  { id: 'mott-haven', name: 'Mott Haven', borough: 'Bronx', lat: 40.8091, lng: -73.9229 },
  { id: 'st-george', name: 'St. George', borough: 'Staten Island', lat: 40.6437, lng: -74.0736 },
] as const satisfies readonly { id: string; name: string; borough: Borough; lat: number; lng: number }[];
export type Neighborhood = (typeof NEIGHBORHOODS)[number];

type NeighborhoodIds = [Neighborhood['id'], ...Neighborhood['id'][]];
export const NeighborhoodId = z.enum(NEIGHBORHOODS.map((n) => n.id) as NeighborhoodIds);
export type NeighborhoodId = z.infer<typeof NeighborhoodId>;

export const latitude = z.number().min(-90).max(90);
export const longitude = z.number().min(-180).max(180);

/** Query-string location: a neighborhood or browser coordinates. Coordinates count only as a pair. */
export const locationQuery = z.object({
  near: NeighborhoodId.optional(),
  lat: z.coerce.number().pipe(latitude).optional(),
  lng: z.coerce.number().pipe(longitude).optional(),
});
