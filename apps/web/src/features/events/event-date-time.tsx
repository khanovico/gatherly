import type { EventSummary } from '@gatherly/shared';
import { cn } from '@/lib/utils';

type EventTime = Pick<EventSummary, 'startsAt' | 'endsAt' | 'timezone'>;

const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const time = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } as const;
const shortDate = { weekday: 'short', month: 'short', day: 'numeric' } as const;
const longDate = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } as const;

const formatRange = (event: EventTime, timeZone: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(undefined, { ...options, timeZone }).formatRange(
    new Date(event.startsAt),
    new Date(event.endsAt),
  );

/**
 * Event time, always in the event's own timezone (labelled), plus the viewer's local time when
 * it reads differently. `compact` is the one-line card form.
 */
export function EventDateTime({
  event,
  compact,
  className,
}: {
  event: EventTime;
  compact?: boolean;
  className?: string;
}) {
  const inEventZone = formatRange(event, event.timezone, { ...shortDate, ...time });
  const local = formatRange(event, viewerTimeZone, { ...shortDate, ...time });
  const city = event.timezone.split('/').pop()!.replaceAll('_', ' ');

  return (
    <time dateTime={event.startsAt} className={cn('flex flex-col gap-0.5', className)}>
      {compact ? (
        <span className="text-primary text-sm font-medium">{inEventZone}</span>
      ) : (
        <>
          <span className="font-medium">{formatRange(event, event.timezone, longDate)}</span>
          <span className="text-muted-foreground text-sm">
            {formatRange(event, event.timezone, time)} · {city} time
          </span>
        </>
      )}
      {local !== inEventZone && (
        <span className="text-muted-foreground text-xs">Your time: {local}</span>
      )}
    </time>
  );
}
