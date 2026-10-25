import type { Category, EventSummary } from '@gatherly/shared';
import {
  Briefcase,
  Code2,
  HeartPulse,
  Mountain,
  Palette,
  PenTool,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

type CategoryMeta = { label: string; icon: LucideIcon; color: string };

/** Display name, icon and icon color per category. Covers live at `/images/covers/<category>-1.webp`. */
export const categoryMeta: Record<Category, CategoryMeta> = {
  tech: { label: 'Tech', icon: Code2, color: 'text-sky-500' },
  design: { label: 'Design', icon: PenTool, color: 'text-fuchsia-500' },
  business: { label: 'Business', icon: Briefcase, color: 'text-amber-500' },
  wellness: { label: 'Wellness', icon: HeartPulse, color: 'text-emerald-500' },
  arts: { label: 'Arts', icon: Palette, color: 'text-rose-500' },
  outdoors: { label: 'Outdoors', icon: Mountain, color: 'text-lime-600' },
  food: { label: 'Food & drink', icon: UtensilsCrossed, color: 'text-orange-500' },
  community: { label: 'Community', icon: Users, color: 'text-violet-500' },
};

export type Seats = Pick<EventSummary, 'capacity' | 'registeredCount'>;
export type SeatState = 'open' | 'low' | 'full';

export function seatState({ capacity, registeredCount }: Seats): SeatState {
  const left = capacity - registeredCount;
  if (left <= 0) return 'full';
  return left <= Math.max(3, capacity * 0.1) ? 'low' : 'open';
}

export function seatsLabel(seats: Seats) {
  const left = seats.capacity - seats.registeredCount;
  const state = seatState(seats);
  if (state === 'full') return 'Sold out';
  if (state === 'low') return left === 1 ? 'Last seat!' : `Only ${left} seats left`;
  return `${left} of ${seats.capacity} seats left`;
}

/** "Online" or "Venue · City". */
export function eventLocation(event: Pick<EventSummary, 'format' | 'venueName' | 'city'>) {
  if (event.format === 'online') return 'Online';
  return [event.venueName, event.city].filter(Boolean).join(' · ');
}
