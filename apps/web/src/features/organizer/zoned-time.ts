/** Wall-clock parts of an instant in a timezone, as "YYYY-MM-DDTHH:mm" (the datetime-local format). */
export function toZonedLocal(instant: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const offset = (instant: number, timeZone: string) =>
  Date.parse(`${toZonedLocal(instant, timeZone)}Z`) - Math.floor(instant / 60_000) * 60_000;

/**
 * UTC ISO string for a "YYYY-MM-DDTHH:mm" wall-clock time in `timeZone`. Re-checks the offset
 * at the result so times next to a DST change land on the right side. '' stays ''.
 */
export function fromZonedLocal(local: string, timeZone: string) {
  const asUtc = Date.parse(`${local}Z`);
  if (!local || Number.isNaN(asUtc)) return '';
  const first = asUtc - offset(asUtc, timeZone);
  return new Date(asUtc - offset(first, timeZone)).toISOString();
}
