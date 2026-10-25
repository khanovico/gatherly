import {
  Borough,
  NEIGHBORHOODS,
  RADIUS_OPTIONS,
  type EventFormat,
  type NeighborhoodId,
  type RadiusKm,
} from '@gatherly/shared';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
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
        <label className="block space-y-2 font-medium">
          <span>Near</span>
          <NativeSelect
            value={where}
            onChange={(e) => pickPlace(e.target.value)}
            className="w-full font-normal [&_select]:h-10"
          >
            <NativeSelectOption value="">{home ? `Home · ${home}` : 'Anywhere'}</NativeSelectOption>
            <NativeSelectOption value="me">My current location</NativeSelectOption>
            {Borough.options.map((borough) => (
              <optgroup key={borough} label={borough}>
                {NEIGHBORHOODS.filter((n) => n.borough === borough).map((n) => (
                  <NativeSelectOption key={n.id} value={n.id}>
                    {n.name}
                  </NativeSelectOption>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </label>
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
