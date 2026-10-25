import {
  Borough,
  NEIGHBORHOODS,
  RADIUS_OPTIONS,
  type Profile,
  type RadiusKm,
} from '@gatherly/shared';
import { Check, ChevronsUpDown, Loader2, LocateFixed } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

type Location = Pick<Profile, 'neighborhood' | 'homeLat' | 'homeLng' | 'radiusKm'>;
type LocationFieldsProps = { value: Location; onChange: (patch: Partial<Location>) => void };

/** Closest neighborhood center (equirectangular distance is plenty at city scale). */
const nearest = (lat: number, lng: number) => {
  const distance = (n: (typeof NEIGHBORHOODS)[number]) =>
    (n.lat - lat) ** 2 + ((n.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
  return NEIGHBORHOODS.reduce((best, n) => (distance(n) < distance(best) ? n : best));
};

/** Home neighborhood (or browser location) and travel radius. */
export function LocationFields({ value, onChange }: LocationFieldsProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const selected = NEIGHBORHOODS.find((n) => n.id === value.neighborhood);

  const locate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setLocating(false);
        const homeLat = Number(latitude.toFixed(4));
        const homeLng = Number(longitude.toFixed(4));
        onChange({ homeLat, homeLng, neighborhood: nearest(homeLat, homeLng).id });
      },
      () => {
        setLocating(false);
        toast.error("We couldn't get your location. Pick a neighborhood instead.");
      },
      { timeout: 10_000 },
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <p id={`${id}-home`} className="mb-3 font-semibold">
          Home neighborhood
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-labelledby={`${id}-home ${id}-value`}
                className="h-11 flex-1 justify-between font-normal"
              >
                <span
                  id={`${id}-value`}
                  className={cn('truncate', !selected && 'text-muted-foreground')}
                >
                  {selected
                    ? `${selected.name}, ${selected.borough}`
                    : 'Search New York neighborhoods'}
                </span>
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
              <Command>
                <CommandInput placeholder="Search neighborhoods" />
                <CommandList>
                  <CommandEmpty>No neighborhood found.</CommandEmpty>
                  {Borough.options.map((borough) => (
                    <CommandGroup key={borough} heading={borough}>
                      {NEIGHBORHOODS.filter((n) => n.borough === borough).map((n) => (
                        <CommandItem
                          key={n.id}
                          value={`${n.name} ${n.borough}`}
                          onSelect={() => {
                            onChange({ neighborhood: n.id, homeLat: null, homeLng: null });
                            setOpen(false);
                          }}
                        >
                          {n.name}
                          <Check className={cn('ml-auto', n.id !== selected?.id && 'opacity-0')} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="secondary" className="h-11" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
            Use my location
          </Button>
        </div>
        {value.homeLat !== null && (
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
            <LocateFixed aria-hidden className="text-primary size-4" />
            Distances use your current location.
          </p>
        )}
      </div>

      <div>
        <p id={`${id}-radius`} className="mb-3 font-semibold">
          How far will you travel?
        </p>
        <ToggleGroup
          type="single"
          spacing={1}
          aria-labelledby={`${id}-radius`}
          value={String(value.radiusKm)}
          onValueChange={(km) => km && onChange({ radiusKm: Number(km) as RadiusKm })}
          className="bg-muted w-full rounded-full p-1 sm:w-fit"
        >
          {RADIUS_OPTIONS.map((km) => (
            <ToggleGroupItem
              key={km}
              value={String(km)}
              className="data-[state=on]:bg-background h-9 flex-1 rounded-full px-5 data-[state=on]:shadow-sm"
            >
              {km} km
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
