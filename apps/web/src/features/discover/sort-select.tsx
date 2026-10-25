import type { SortOrder } from '@gatherly/shared';
import { ArrowDownUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const labels: Record<SortOrder, string> = {
  for_you: 'For you',
  soonest: 'Soonest',
  nearest: 'Nearest',
  popular: 'Popular',
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
        <ArrowDownUp aria-hidden className="text-muted-foreground max-sm:hidden" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {options.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {labels[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
