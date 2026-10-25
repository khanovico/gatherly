import type { Category } from '@gatherly/shared';
import { categoryMeta } from '@/features/events/lib';
import { cn } from '@/lib/utils';

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const { label, icon: Icon, color } = categoryMeta[category];
  return (
    <span
      className={cn(
        'bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <Icon aria-hidden className={cn('size-3.5', color)} />
      {label}
    </span>
  );
}
