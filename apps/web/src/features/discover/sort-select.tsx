import type { SortOrder } from '@gatherly/shared';
import { CalendarClock, Flame, MapPin, Sparkles, type LucideIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const labels: Record<SortOrder, [string, LucideIcon]> = {
  for_you: ['For you', Sparkles],
  soonest: ['Soonest', CalendarClock],
  nearest: ['Nearest', MapPin],
  popular: ['Popular', Flame],
};

/** Result order. "For you" is offered only to signed-in members, whose profile it ranks by. */
export function SortSelect({
  value,
  onChange,
  signedIn,
}: {
  value: SortOrder;
  onChange: (sort: SortOrder) => void;
  signedIn: boolean;
}) {
  const options = (Object.keys(labels) as SortOrder[]).filter((s) => signedIn || s !== 'for_you');
  return (
    <Select value={value} onValueChange={(sort) => onChange(sort as SortOrder)}>
      <SelectTrigger aria-label="Sort events" className="h-11! shrink-0 rounded-full px-4 sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="min-w-44 rounded-xl">
        {options.map((sort) => {
          const [label, Icon] = labels[sort];
          return (
            <SelectItem key={sort} value={sort}>
              <Icon aria-hidden className="text-muted-foreground" />
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
