import { LogIn, ShieldX } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/** Shown on `/admin` to anyone who is not an admin. The API enforces the same rule. */
export function AccessDenied({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="page-container flex flex-col items-center py-24 text-center">
      <div className="bg-destructive/10 text-destructive grid size-16 place-items-center rounded-2xl">
        <ShieldX className="size-7" aria-hidden />
      </div>
      <p className="text-muted-foreground mt-6 text-sm font-medium tracking-widest">403</p>
      <h1 className="mt-1 text-3xl font-semibold">Admins only</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        {signedIn
          ? 'Your account does not have access to the admin console. Switch to the Admin persona to manage the platform.'
          : 'Sign in as the Admin persona to manage members, events and demo data.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-brand">
          <Link to="/signin">
            <LogIn /> {signedIn ? 'Switch persona' : 'Sign in'}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/events">Browse events</Link>
        </Button>
      </div>
    </section>
  );
}
