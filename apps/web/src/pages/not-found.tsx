import { Compass, Home } from 'lucide-react';
import { Link } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { Button } from '@/components/ui/button';

export function Component() {
  return (
    <section className="page-container py-16 sm:py-24">
      <IllustratedState
        as="h1"
        image="/images/misc/404.webp"
        title="This page wandered off"
        description="The link may be broken, or the page may have moved. Let's get you back to the good stuff."
      >
        <Button asChild size="lg" className="bg-brand hover:opacity-90">
          <Link to="/events">
            <Compass /> Discover events
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/">
            <Home /> Home
          </Link>
        </Button>
      </IllustratedState>
    </section>
  );
}
