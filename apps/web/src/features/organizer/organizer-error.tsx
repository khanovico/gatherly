import { Link } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

const backToDashboard = (
  <Button asChild variant="outline">
    <Link to="/organizer">Back to dashboard</Link>
  </Button>
);

/** Page-level state for a failed organizer query: not the owner, missing, or broken. */
export function OrganizerError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;
  return (
    <section className="page-container py-16 sm:py-24">
      {status === 403 ? (
        <IllustratedState
          as="h1"
          image="/images/empty/error.webp"
          title="This event belongs to another organizer"
          description="Only its organizer and admins can manage it."
        >
          {backToDashboard}
        </IllustratedState>
      ) : status === 404 ? (
        <IllustratedState
          as="h1"
          image="/images/empty/no-results.webp"
          title="Event not found"
          description="It may have been removed, or the link is wrong."
        >
          {backToDashboard}
        </IllustratedState>
      ) : (
        <IllustratedState
          as="h1"
          image="/images/empty/error.webp"
          title="We couldn't load this page"
          description="Check your connection and try again."
        >
          <Button onClick={onRetry}>Try again</Button>
        </IllustratedState>
      )}
    </section>
  );
}
