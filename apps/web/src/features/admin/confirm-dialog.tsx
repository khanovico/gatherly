import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type ConfirmDialogProps = {
  trigger: ReactNode;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
  /** Extra gate, e.g. a typed confirmation phrase. */
  canConfirm?: boolean;
  children?: ReactNode;
};

/** Destructive confirmation. Stays open while `pending`; the caller closes it on success. */
export function ConfirmDialog({
  trigger,
  icon: Icon,
  canConfirm = true,
  ...props
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {props.children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.pending}>{props.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canConfirm || props.pending}
            onClick={(e) => {
              e.preventDefault();
              props.onConfirm();
            }}
          >
            {props.pending ? 'Working…' : props.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
