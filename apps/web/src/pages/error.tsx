import { Home, RotateCw } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { Button } from '@/components/ui/button';
import { Component as NotFound } from '@/pages/not-found';

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;

  return (
    <section className="page-container py-16 sm:py-24">
      <IllustratedState
        as="h1"
        image="/images/empty/error.webp"
        title="Something went wrong"
        description="An unexpected error stopped this page from loading. Reloading usually fixes it."
      >
        {/* A full reload also recovers from a stale chunk after a new deploy. */}
        <Button size="lg" onClick={() => window.location.reload()}>
          <RotateCw /> Try again
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
