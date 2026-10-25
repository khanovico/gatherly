import { type SeatState, type Seats, seatState, seatsLabel } from '@/features/events/lib';
import { cn } from '@/lib/utils';

const styles: Record<SeatState, { bar: string; text: string }> = {
  open: { bar: 'bg-success', text: 'text-muted-foreground' },
  low: { bar: 'bg-warning', text: 'font-medium text-amber-700 dark:text-amber-400' },
  full: { bar: 'bg-destructive', text: 'text-destructive font-medium' },
};

/** Seats bar plus label: "12 of 40 seats left", "Only 2 seats left", "Sold out". */
export function SeatsMeter({ seats, className }: { seats: Seats; className?: string }) {
  const state = seatState(seats);
  const percent = Math.min(100, (seats.registeredCount / seats.capacity) * 100);
  const label = seatsLabel(seats);
  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        role="meter"
        aria-label="Seats taken"
        aria-valuemin={0}
        aria-valuemax={seats.capacity}
        aria-valuenow={seats.registeredCount}
        aria-valuetext={label}
        className="bg-muted h-1.5 overflow-hidden rounded-full"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', styles[state].bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={cn('text-xs', styles[state].text)}>{label}</p>
    </div>
  );
}
