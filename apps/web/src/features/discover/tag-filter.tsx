import { CATEGORY_TAGS, type Category } from '@gatherly/shared';
import { categoryMeta } from '@/features/events/lib';

/** The picked category's topics as multi-select chips. */
export function TagFilter(props: {
  category: Category;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const { category, value, onChange } = props;
  return (
    <div
      role="group"
      aria-label={`${categoryMeta[category].label} topics`}
      className="mt-2 flex flex-wrap gap-1.5"
    >
      {CATEGORY_TAGS[category].map((tag) => {
        const on = value.includes(tag);
        return (
          <button
            key={tag}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((t) => t !== tag) : [...value, tag])}
            className="text-muted-foreground hover:text-foreground aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:border-primary/40 focus-visible:ring-ring/50 rounded-full border border-dashed px-3 py-1 text-xs font-medium transition outline-none focus-visible:ring-[3px] aria-pressed:border-solid"
          >
            #{tag}
          </button>
        );
      })}
    </div>
  );
}
