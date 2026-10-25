import { createEventInput, type Category, type EventFormat } from '@gatherly/shared';
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
  /** '' lets the API pick the category's cover. */
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
    coverImage: values.coverImage || undefined,
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
