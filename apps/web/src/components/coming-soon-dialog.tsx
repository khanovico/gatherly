import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type ComingSoonDialogProps = {
  title: string;
  description: ReactNode;
  trigger: ReactNode;
};

/** Explains a feature that is visible in the demo but not built yet (sign-up, billing). */
export function ComingSoonDialog({ title, description, trigger }: ComingSoonDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <img src="/images/brand/mark.webp" alt="" className="size-16" />
          <Badge variant="secondary">
            <Sparkles /> Coming soon
          </Badge>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button className="w-full">Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
