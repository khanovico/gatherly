import { CATEGORIES, type Category } from '@gatherly/shared';
import { Check } from 'lucide-react';
import { categoryMeta } from '@/features/events/lib';
import { cn } from '@/lib/utils';

export const MIN_INTERESTS = 3;

type InterestPickerProps = { value: Category[]; onChange: (value: Category[]) => void };

/** Category cover tiles, toggled on and off. Selection order is kept (strongest interest first). */
export function InterestPicker({ value, onChange }: InterestPickerProps) {
  const toggle = (category: Category) =>
    onChange(value.includes(category) ? value.filter((c) => c !== category) : [...value, category]);

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {CATEGORIES.map((category) => {
        const { label, icon: Icon } = categoryMeta[category];
        const selected = value.includes(category);
        return (
          <li key={category}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(category)}
              className={cn(
                'group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl text-left shadow-xs outline-none transition',
                'focus-visible:ring-ring/50 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-[3px]',
                selected && 'ring-primary ring-offset-background ring-[3px] ring-offset-2',
              )}
            >
              <img
                src={`/images/covers/${category}-1.webp`}
                alt=""
                className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent group-aria-pressed:from-primary/85 group-aria-pressed:via-primary/30" />
              <span className="absolute inset-x-3 bottom-3 flex items-center gap-2 font-semibold text-white">
                <Icon aria-hidden className="size-5 shrink-0" />
                {label}
              </span>
              <span
                aria-hidden
                className={cn(
                  'absolute top-3 right-3 grid size-7 place-items-center rounded-full border-2 border-white/80 transition',
                  selected
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'bg-black/20',
                )}
              >
                {selected && <Check className="size-4" />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
