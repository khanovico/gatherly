import { useParams } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { NotFound } from '@/components/not-found';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicProfileView } from '@/features/profile/public-profile-view';
import { usePublicProfile } from '@/features/profile/queries';
import { ApiError } from '@/lib/api';

export function Component() {
  const { id = '' } = useParams();
  const { data, error } = usePublicProfile(id);

  // A malformed id fails validation (400); treat it like an unknown member.
  if (error instanceof ApiError && [400, 404].includes(error.status)) return <NotFound />;
  if (error) {
    return (
      <IllustratedState
        as="h1"
        image="/images/empty/error.webp"
        title="We couldn't load this profile"
        description="Check your connection and refresh the page."
      />
    );
  }
  if (!data) {
    return <Skeleton aria-busy className="page-container my-10 h-96 max-w-6xl rounded-3xl" />;
  }
  return <PublicProfileView profile={data} />;
}
