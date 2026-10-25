import { format, parseISO, startOfDay } from 'date-fns';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { DateFilterValue } from '@/features/events/lib';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

const presets = [
  { label: 'Any date', value: {} },
  { label: 'This weekend', value: { when: 'weekend' } },
  { label: 'Next 7 days', value: { when: 'week' } },
] satisfies { label: string; value: DateFilterValue }[];
const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const rangeLabel = (range: DateRange) =>
  dayFormat.formatRange(range.from!, range.to ?? range.from!);

/**
 * Date filter: quick presets plus a custom from–to range on a calendar, in a popover from `sm` up
 * and a bottom sheet on phones. An active custom range shows as a chip that clears with its ×.
 */
export function DateFilter({
  value,
  onChange,
  className,
}: {
  value: DateFilterValue;
  onChange: (next: DateFilterValue) => void;
  className?: string;
}) {
  const desktop = useMediaQuery('(min-width: 640px)');
  const [today] = useState(() => startOfDay(new Date()));
  const range = value.from && { from: parseISO(value.from), to: parseISO(value.to ?? value.from) };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  const toggle = (next: boolean) => {
    if (next) setDraft(range || undefined);
    setOpen(next);
  };
  const choose = (next: DateFilterValue) => {
    onChange(next);
    setOpen(false);
  };
  const day = (date: Date) => format(date, 'yyyy-MM-dd');

  const trigger = (
    <button className="focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center gap-2 rounded-full pr-3 pl-4 outline-none focus-visible:ring-[3px]">
      <CalendarDays aria-hidden className="size-4 shrink-0 opacity-70" />
      <span className="flex-1 truncate text-left">
        {range ? rangeLabel(range) : presets.find((p) => p.value.when === value.when)?.label}
      </span>
      {!range && <ChevronDown aria-hidden className="size-4 opacity-50" />}
    </button>
  );
  const body = (
    <div className="flex flex-col sm:flex-row">
      <div className="flex gap-2 overflow-x-auto p-3 sm:w-40 sm:flex-col sm:border-r">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={!range && preset.value.when === value.when ? 'secondary' : 'ghost'}
            size="sm"
            className="justify-start"
            onClick={() => choose(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div>
        <Calendar
          mode="range"
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={desktop ? 2 : 1}
          defaultMonth={draft?.from}
          disabled={{ before: today }}
          className={cn('mx-auto bg-transparent', !desktop && '[--cell-size:--spacing(10)]')}
        />
        <div className="flex items-center justify-between gap-3 border-t p-3">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {draft?.from ? rangeLabel(draft) : 'Pick a start and end date'}
          </p>
          <Button
            size="sm"
            disabled={!draft?.from}
            onClick={() =>
              draft?.from && choose({ from: day(draft.from), to: day(draft.to ?? draft.from) })
            }
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'bg-card flex h-11 items-center rounded-full border text-sm',
        range && 'border-primary bg-accent text-accent-foreground',
        className,
      )}
    >
      {desktop ? (
        <Popover open={open} onOpenChange={toggle}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            {body}
          </PopoverContent>
        </Popover>
      ) : (
        <Sheet open={open} onOpenChange={toggle}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent side="bottom" className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-2xl">
            <SheetHeader className="pb-0">
              <SheetTitle>When</SheetTitle>
            </SheetHeader>
            {body}
          </SheetContent>
        </Sheet>
      )}
      {range && (
        <button
          aria-label="Clear date range"
          onClick={() => onChange({})}
          className="hover:bg-primary/10 focus-visible:ring-ring/50 mr-1.5 grid size-8 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-[3px]"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
