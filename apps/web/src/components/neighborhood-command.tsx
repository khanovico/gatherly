import { Borough, NEIGHBORHOODS, type NeighborhoodId } from '@gatherly/shared';
import type { ReactNode } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

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
                data-checked={n.id === selected}
                onSelect={() => onSelect(n.id)}
              >
                {n.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}
