import { Borough, NEIGHBORHOODS, type NeighborhoodId } from '@gatherly/shared';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

type Props = {
  selected?: string;
  onSelect: (id: NeighborhoodId) => void;
  /** Extra items listed above the boroughs, e.g. "Anywhere" or "My current location". */
  children?: ReactNode;
};

/** Searchable New York neighborhood list grouped by borough, for use inside a popover. */
export function NeighborhoodCommand({ selected, onSelect, children }: Props) {
  return (
    <Command>
      <CommandInput placeholder="Search neighborhoods" />
      <CommandList>
        <CommandEmpty>No neighborhood found.</CommandEmpty>
        {children && <CommandGroup>{children}</CommandGroup>}
        {Borough.options.map((borough) => (
          <CommandGroup key={borough} heading={borough}>
            {NEIGHBORHOODS.filter((n) => n.borough === borough).map((n) => (
              <CommandItem
                key={n.id}
                value={`${n.name} ${n.borough}`}
                onSelect={() => onSelect(n.id)}
              >
                {n.name}
                <Check className={cn('ml-auto', n.id !== selected && 'opacity-0')} />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}
