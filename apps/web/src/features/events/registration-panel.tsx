import type { EventDetail } from '@gatherly/shared';
import { Ban, CircleCheck, Clock, Loader2, LogIn, Ticket, type LucideIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { seatState, seatsLabel } from '@/features/events/lib';
import { useRegistration } from '@/features/events/registration';
import { SeatsMeter } from '@/features/events/seats-meter';
import { useMe } from '@/hooks/use-me';
import { cn } from '@/lib/utils';

type Notice = { icon: LucideIcon; text: string; tone: string };

/**
 * Price, seats and the one action that fits the event's state. A sticky card from `lg` up; a
 * bar fixed to the bottom of the screen below that.
 */
export function RegistrationPanel({ event }: { event: EventDetail }) {
  const { data: me } = useMe();
  const { register, cancel } = useRegistration(event);
  const { pathname } = useLocation();
  const busy = register.isPending || cancel.isPending;
  const [now] = useState(Date.now);
  const closed = event.status === 'cancelled' || Date.parse(event.startsAt) <= now;

  let notice: Notice | undefined;
  let action: ReactNode = null;
  const spinner = busy && <Loader2 className="animate-spin" />;
  if (event.status === 'cancelled')
    notice = { icon: Ban, text: 'The organizer cancelled this event.', tone: 'text-destructive' };
  else if (Date.parse(event.endsAt) <= now)
    notice = { icon: Clock, text: 'This event has ended.', tone: 'text-muted-foreground' };
  else if (closed)
    notice = { icon: Clock, text: 'Happening now. Registration is closed.', tone: 'text-primary' };
  else if (event.viewerRegistration) {
    notice = { icon: CircleCheck, text: "You're going! Seat confirmed.", tone: 'text-success' };
    action = (
      <Button variant="outline" size="lg" disabled={busy} onClick={() => cancel.mutate()}>
        {spinner} Cancel registration
      </Button>
    );
  } else if (!me)
    action = (
      <Button asChild size="lg" className="bg-brand hover:opacity-90">
        <Link to={`/signin?next=${encodeURIComponent(pathname)}`}>
          <LogIn /> Sign in to register
        </Link>
      </Button>
    );
  else if (seatState(event) === 'full')
    action = (
      <Button size="lg" disabled>
        Sold out
      </Button>
    );
  else
    action = (
      <Button
        size="lg"
        className="bg-brand hover:opacity-90"
        disabled={busy}
        onClick={() => register.mutate()}
      >
        {spinner || <Ticket />} Reserve a seat
      </Button>
    );

  const noticeLine = notice && (
    <p className={cn('flex items-center gap-2 text-sm font-medium', notice.tone)} role="status">
      <notice.icon aria-hidden className="size-4 shrink-0" /> {notice.text}
    </p>
  );

  return (
    <>
      <aside
        aria-label="Registration"
        className="bg-card sticky top-24 hidden space-y-5 self-start rounded-2xl border p-6 shadow-sm lg:block"
      >
        <div>
          <p className="text-3xl font-semibold">Free</p>
          <p className="text-muted-foreground text-sm">No ticket fees, instant confirmation</p>
        </div>
        {!closed && <SeatsMeter seats={event} />}
        {noticeLine}
        {action && <div className="grid">{action}</div>}
      </aside>
      <div className="bg-background fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)] lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {noticeLine ?? (
              <>
                <p className="font-semibold">Free</p>
                <p className="text-muted-foreground truncate text-sm">{seatsLabel(event)}</p>
              </>
            )}
          </div>
          {action}
        </div>
      </div>
    </>
  );
}
