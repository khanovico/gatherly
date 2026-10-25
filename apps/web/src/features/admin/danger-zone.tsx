import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/features/admin/confirm-dialog';
import { apiFetch } from '@/lib/api';

const phrase = 'reset demo';

/** Reset demo data: wipes events and background members, then reseeds. Needs a typed phrase. */
export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const queryClient = useQueryClient();
  const reset = useMutation({
    mutationFn: () => apiFetch<void>('/admin/demo/reset', { method: 'POST' }),
    onSuccess: () => {
      setOpen(false);
      toast.success('Demo data reset', { description: 'Events, members and tickets are fresh.' });
      return queryClient.invalidateQueries();
    },
  });

  return (
    <section
      aria-labelledby="danger-zone"
      className="border-destructive/30 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex gap-4">
        <span className="bg-destructive/10 text-destructive grid size-10 shrink-0 place-items-center rounded-xl">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="danger-zone" className="font-semibold">
            Danger zone
          </h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Reset demo data restores the seeded events, members and tickets. Demo personas and your
            session are kept.
          </p>
        </div>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setTyped('');
        }}
        trigger={
          <Button variant="destructive" className="shrink-0">
            <RotateCcw /> Reset demo data
          </Button>
        }
        icon={RotateCcw}
        title="Reset all demo data?"
        description="Every event, registration and background member is deleted and the demo is seeded again. Everyone using the demo sees the change. This cannot be undone."
        cancelLabel="Keep data"
        confirmLabel="Reset demo data"
        pending={reset.isPending}
        canConfirm={typed.trim().toLowerCase() === phrase}
        onConfirm={() => reset.mutate()}
      >
        <Field>
          <FieldLabel htmlFor="reset-phrase">
            Type <span className="font-mono font-semibold">{phrase}</span> to confirm
          </FieldLabel>
          <Input
            id="reset-phrase"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </Field>
      </ConfirmDialog>
    </section>
  );
}
