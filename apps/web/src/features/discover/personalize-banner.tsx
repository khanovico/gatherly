import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

const KEY = 'gatherly.personalize-banner.dismissed';

/** Invites signed-out visitors to sign up for a ranked Discover. Dismissal sticks on this device. */
export function PersonalizeBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // Private mode: it stays hidden until the next visit.
    }
  };
  return (
    <aside className="bg-card relative mt-6 flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 pr-12 shadow-xs sm:flex-row sm:items-center sm:p-6 sm:pr-14">
      <div
        aria-hidden
        className="bg-brand absolute -top-20 -right-10 size-56 rounded-full opacity-15 blur-3xl"
      />
      <div className="bg-brand grid size-12 shrink-0 place-items-center rounded-xl text-white shadow-md">
        <Sparkles aria-hidden className="size-6" />
      </div>
      <div className="flex-1">
        <h2 className="font-semibold">Get events picked for you</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Tell us what you're into and where you live. Discover then ranks events by your interests,
          neighborhood and schedule, and shows why.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild className="bg-brand hover:opacity-90">
          <Link to="/signin?mode=signup&next=/events">Sign up free</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/signin?next=/events">Sign in</Link>
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute top-3 right-3"
      >
        <X />
      </Button>
    </aside>
  );
}
