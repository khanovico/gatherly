import type { EventSummary } from '@gatherly/shared';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useToggleSave } from '@/features/events/saves';
import { cn } from '@/lib/utils';

type SaveButtonProps = { event: Pick<EventSummary, 'id' | 'title' | 'saved'>; className?: string };

/** Heart toggle for an event card. Unsaving offers Undo. */
export function SaveButton({ event, className }: SaveButtonProps) {
  const toggle = useToggleSave();
  const saved = toggle.isPending ? toggle.variables.saved : !!event.saved;
  const onClick = () =>
    toggle.mutate(
      { id: event.id, saved: !saved },
      {
        onSuccess: () =>
          saved &&
          toast('Removed from saved', {
            action: { label: 'Undo', onClick: () => toggle.mutate({ id: event.id, saved: true }) },
          }),
      },
    );

  return (
    <Button
      size="icon"
      variant="secondary"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${event.title} from saved` : `Save ${event.title}`}
      className={cn('bg-background/90 rounded-full shadow-sm backdrop-blur', className)}
      onClick={onClick}
    >
      <Heart className={cn('transition', saved && 'fill-rose-500 text-rose-500')} />
    </Button>
  );
}
