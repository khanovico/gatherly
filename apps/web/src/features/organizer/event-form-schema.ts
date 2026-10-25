import {
  createEventInput,
  type Category,
  type EventDetail,
  type EventFormat,
} from '@gatherly/shared';
import { z } from 'zod';
import { fromZonedLocal, toZonedLocal } from '@/features/organizer/zoned-time';

export type EventFormValues = {
  title: string;
  summary: string;
  description: string;
  category: Category;
  format: EventFormat;
  venueName: string;
  address: string;
  city: string;
  onlineUrl: string;
  /** Wall-clock "YYYY-MM-DDTHH:mm" in `timezone`, as a datetime-local input holds it. */
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number;
  /** '' means the category's first cover. */
  coverImage: string;
};

/** Form values → API body, validated by the shared schema so errors keep the API's field names. */
export const eventFormSchema = z
  .custom<EventFormValues>()
  .transform((values): z.input<typeof createEventInput> => ({
    ...values,
    startsAt: fromZonedLocal(values.startsAt, values.timezone),
    endsAt: fromZonedLocal(values.endsAt, values.timezone),
    onlineUrl: values.onlineUrl.trim() || undefined,
    coverImage: values.coverImage || `/images/covers/${values.category}-1.webp`,
  }))
  .pipe(createEventInput);

/** Plain-language messages for the shared schema's built-in checks. */
export const friendlyErrors: z.core.$ZodErrorMap = (issue) => {
  const isText = issue.origin === 'string';
  if (issue.code === 'too_small') {
    if (isText) return issue.minimum === 1 ? 'Required' : `At least ${issue.minimum} characters`;
    return `At least ${issue.minimum}`;
  }
  if (issue.code === 'too_big') {
    return isText
      ? `At most ${issue.maximum} characters`
      : `At most ${issue.maximum.toLocaleString()}`;
  }
  if (issue.code === 'invalid_format') {
    return issue.format === 'url' ? 'Enter a full link, e.g. https://…' : 'Pick a date and time';
  }
  if (issue.code === 'invalid_type') return 'Required';
};

export const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** A blank event a week from now, 6–8 PM in the viewer's timezone. */
export function newEventForm(): EventFormValues {
  const day = toZonedLocal(Date.now() + 7 * 86_400_000, viewerTimeZone).slice(0, 10);
  return {
    title: '',
    summary: '',
    description: '',
    category: 'community',
    format: 'in_person',
    venueName: '',
    address: '',
    city: '',
    onlineUrl: '',
    startsAt: `${day}T18:00`,
    endsAt: `${day}T20:00`,
    timezone: viewerTimeZone,
    capacity: 50,
    coverImage: '',
  };
}

/** A stored event as form values, with times shown in the event's own timezone. */
export function eventToForm(event: EventDetail): EventFormValues {
  return {
    title: event.title,
    summary: event.summary,
    description: event.description,
    category: event.category,
    format: event.format,
    venueName: event.venueName ?? '',
    address: event.address ?? '',
    city: event.city ?? '',
    onlineUrl: event.onlineUrl ?? '',
    startsAt: toZonedLocal(Date.parse(event.startsAt), event.timezone),
    endsAt: toZonedLocal(Date.parse(event.endsAt), event.timezone),
    timezone: event.timezone,
    capacity: event.capacity,
    coverImage: event.coverImage,
  };
}
