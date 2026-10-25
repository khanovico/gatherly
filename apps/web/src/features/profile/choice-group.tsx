import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Choice<T extends string> = {
  value: T;
  label: string;
  description: string;
  icon: LucideIcon;
};

type ChoiceGroupProps<T extends string> = {
  legend: string;
  choices: Choice<T>[];
  value: T[];
  onChange: (value: T[]) => void;
};

/** Multi-select cards. The last selected card cannot be turned off, so a choice always remains. */
export function ChoiceGroup<T extends string>(props: ChoiceGroupProps<T>) {
  const { legend, choices, value, onChange } = props;
  return (
    <fieldset>
      <legend className="mb-3 font-semibold">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
        {choices.map(({ value: option, label, description, icon: Icon }) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              aria-disabled={selected && value.length === 1}
              onClick={() =>
                selected
                  ? value.length > 1 && onChange(value.filter((v) => v !== option))
                  : onChange([...value, option])
              }
              className={cn(
                'bg-card hover:border-primary/50 focus-visible:ring-ring/50 flex items-start gap-3 rounded-xl border p-4 text-left transition outline-none focus-visible:ring-[3px]',
                selected && 'border-primary bg-primary/5 ring-primary ring-1',
              )}
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-lg',
                  selected ? 'bg-brand text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="text-muted-foreground block text-sm">{description}</span>
              </span>
              {selected && <Check aria-hidden className="text-primary size-5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
