import type { EventSummary } from '@gatherly/shared';
import { useWatch } from 'react-hook-form';
import { EventCard } from '@/features/events/event-card';
import type { EventFormValues } from '@/features/organizer/event-form-schema';
import { fromZonedLocal } from '@/features/organizer/zoned-time';

/** The Discover card for the event as typed, with placeholders for what is still empty. */
export function EventPreview({ registeredCount = 0 }: { registeredCount?: number }) {
  const values = useWatch<EventFormValues>();
  const { category = 'community', timezone = 'UTC', capacity = 0 } = values;
  const startsAt = fromZonedLocal(values.startsAt ?? '', timezone) || new Date().toISOString();
  const endsAt = fromZonedLocal(values.endsAt ?? '', timezone);
  const event: EventSummary = {
    id: 'preview',
    organizerId: 'preview',
    title: values.title || 'Your event title',
    summary: values.summary ?? '',
    category,
    format: values.format ?? 'in_person',
    venueName: values.venueName || 'Venue',
    city: values.city || null,
    startsAt,
    endsAt: endsAt > startsAt ? endsAt : startsAt,
    timezone,
    capacity: capacity > 0 ? capacity : Math.max(registeredCount, 1),
    registeredCount,
    priceCents: 0,
    currency: 'USD',
    status: 'published',
    coverImage: values.coverImage || `/images/covers/${category}-1.webp`,
  };
  return (
    <aside aria-label="Live preview" className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      <p className="text-muted-foreground text-sm font-medium">Live preview</p>
      <div inert>
        <EventCard event={event} />
      </div>
      <p className="text-muted-foreground text-xs">How your event appears on Discover.</p>
    </aside>
  );
}
