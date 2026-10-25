import {
  NEIGHBORHOODS,
  RADIUS_OPTIONS,
  type EventFormat,
  type NeighborhoodId,
  type RadiusKm,
} from '@gatherly/shared';
import { ChevronDown, Globe, House, LocateFixed, MapPin, SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { NeighborhoodCommand } from '@/components/neighborhood-command';
import { Button } from '@/components/ui/button';
import { CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type PlaceFilters = {
  format?: EventFormat;
  free?: boolean;
  near?: NeighborhoodId;
  lat?: number;
  lng?: number;
  radius?: RadiusKm;
};

type Props = {
  value: PlaceFilters;
  /** URL search params to set; `undefined` clears one. */
  onChange: (params: Record<string, string | undefined>) => void;
  /** The signed-in member's home neighborhood, used when no other location is picked. */
  home?: string;
};

/** Format, location + radius and price, behind one "Filters" button with an active count. */
export function FilterPanel({ value, onChange, home }: Props) {
  const where = value.lat !== undefined ? 'me' : (value.near ?? '');
  const active = [value.format, value.free, where, value.radius].filter(Boolean).length;
  const pickPlace = (near: string) =>
    near === 'me'
      ? navigator.geolocation.getCurrentPosition(
          // ~100 m precision is enough for distances and keeps the URL from pinpointing anyone.
          ({ coords: c }) =>
            onChange({ lat: c.latitude.toFixed(3), lng: c.longitude.toFixed(3), near: undefined }),
          () => toast.error("We couldn't get your location. Pick a neighborhood instead."),
          { timeout: 10_000 },
        )
      : onChange({ near: near || undefined, lat: undefined, lng: undefined });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-11 rounded-full px-3.5 sm:px-4">
          <SlidersHorizontal /> <span className="sr-only sm:not-sr-only">Filters</span>
          {active > 0 && (
            <span className="bg-primary text-primary-foreground grid size-5 place-items-center rounded-full text-xs">
              {active}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-[min(22rem,calc(100vw-2rem))] space-y-5 p-5 text-sm"
      >
        <Choice
          label="Format"
          value={value.format}
          onChange={(format) => onChange({ format })}
          options={[
            ['in_person', 'In person'],
            ['online', 'Online'],
          ]}
        />
        <NearPicker where={where} home={home} onPick={pickPlace} />
        <Choice
          label="Distance"
          disabled={!where && !home}
          value={value.radius?.toString()}
          onChange={(radius) => onChange({ radius })}
          options={RADIUS_OPTIONS.map((km) => [String(km), `${km} km`])}
        />
        <Choice
          label="Price"
          value={value.free ? '1' : undefined}
          onChange={(free) => onChange({ free })}
          options={[['1', 'Free only']]}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Searchable "Near" combobox: home or anywhere, current location, or a neighborhood. */
function NearPicker(props: { where: string; home?: string; onPick: (near: string) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anywhere = props.home ? `Home · ${props.home}` : 'Anywhere';
  const label =
    props.where === 'me'
      ? 'My current location'
      : (NEIGHBORHOODS.find((n) => n.id === props.where)?.name ?? anywhere);
  const pick = (near: string) => {
    props.onPick(near);
    setOpen(false);
  };
  const extra = (value: string, Icon: typeof Globe, text: string) => (
    <CommandItem value={text} data-checked={props.where === value} onSelect={() => pick(value)}>
      <Icon className="text-muted-foreground" />
      {text}
    </CommandItem>
  );
  const Lead = props.where === 'me' ? LocateFixed : props.where || !props.home ? MapPin : House;
  return (
    <div className="space-y-2">
      <p id={id} className="font-medium">
        Near
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            aria-labelledby={`${id} ${id}-value`}
            className="bg-muted hover:bg-accent h-10 w-full justify-start rounded-full px-4 font-normal"
          >
            <Lead className="text-primary" />
            <span id={`${id}-value`} className="truncate">
              {label}
            </span>
            <ChevronDown className="text-muted-foreground ml-auto" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-(--radix-popover-trigger-width) overflow-hidden rounded-xl p-0"
        >
          <NeighborhoodCommand selected={props.where} onSelect={pick}>
            {extra('', props.home ? House : Globe, anywhere)}
            {extra('me', LocateFixed, 'My current location')}
          </NeighborhoodCommand>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Segmented single choice with a leading "Any" option, which reports `undefined`. */
function Choice(props: {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
  options: string[][];
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={props.disabled}>
      <legend className="font-medium">{props.label}</legend>
      <ToggleGroup
        type="single"
        spacing={1}
        value={props.value ?? 'any'}
        // Pressing the selected item again reports '': both mean "any".
        onValueChange={(value) => props.onChange(value === 'any' ? undefined : value || undefined)}
        className="bg-muted w-full rounded-full p-1"
      >
        {[['any', 'Any'], ...props.options].map(([value, label]) => (
          <ToggleGroupItem
            key={value}
            value={value!}
            className="data-[state=on]:bg-background h-8 flex-1 rounded-full text-xs data-[state=on]:shadow-sm"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  );
}
