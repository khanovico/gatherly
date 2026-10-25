import { Category, NEIGHBORHOODS } from '@gatherly/shared';
import { X } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { categoryMeta } from '@/features/events/lib';

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const day = (value: string) => dayFormat.format(new Date(`${value}T00:00`));
const whenLabels: Record<string, string> = { weekend: 'This weekend', week: 'Next 7 days' };
const formatLabels: Record<string, string> = { in_person: 'In person', online: 'Online' };

/** One removable chip per active filter in the URL, plus "Clear all" (the sort is kept). */
export function ActiveFilters() {
  const [params, setParams] = useSearchParams();
  const get = (key: string) => params.get(key) ?? '';
  const [q, from, to] = [get('q'), get('from'), get('to')];
  const category = Category.safeParse(get('category')).data;
  const dates = from
    ? [...new Set([from, to || from])].map(day).join(' – ')
    : whenLabels[get('when')];
  const place = params.has('lat')
    ? 'Near me'
    : NEIGHBORHOODS.find((n) => n.id === get('near'))?.name;
  const chips: [keys: string[], label: string | undefined][] = [
    [['q'], q && `“${q}”`],
    [['category', 'tags'], category && categoryMeta[category].label],
    [['tags'], get('tags') && `#${get('tags').replaceAll(',', ' #')}`],
    [['when', 'from', 'to'], dates],
    [['format'], formatLabels[get('format')]],
    [['near', 'lat', 'lng'], place],
    [['radius'], get('radius') && `Within ${get('radius')} km`],
    [['free'], get('free') === '1' ? 'Free only' : undefined],
  ];
  const active = chips.filter(([, label]) => label);
  if (active.length === 0) return null;

  const remove = (keys: string[]) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      keys.forEach((key) => next.delete(key));
      return next;
    });
  return (
    <ul aria-label="Active filters" className="mt-4 flex flex-wrap items-center gap-2">
      {active.map(([keys, label]) => (
        <li key={keys[0]}>
          <button
            onClick={() => remove(keys)}
            aria-label={`Remove filter ${label}`}
            className="bg-accent text-accent-foreground hover:bg-accent/70 focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-full py-1 pr-2 pl-3 text-sm font-medium transition outline-none focus-visible:ring-[3px]"
          >
            {label} <X aria-hidden className="size-3.5 opacity-70" />
          </button>
        </li>
      ))}
      <li>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setParams(params.has('sort') ? { sort: get('sort') } : {})}
        >
          Clear all
        </Button>
      </li>
    </ul>
  );
}
