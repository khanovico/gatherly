import { IllustratedState } from '@/components/illustrated-state';
import { RequireSignIn } from '@/components/require-entitlement';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileEditor } from '@/features/profile/profile-editor';
import { useProfile } from '@/features/profile/queries';
import { useMe } from '@/hooks/use-me';

export function Component() {
  return (
    <RequireSignIn>
      <ProfilePage />
    </RequireSignIn>
  );
}

function ProfilePage() {
  const { data: me } = useMe();
  const { data: profile, isError } = useProfile();

  if (isError) {
    return (
      <IllustratedState
        as="h1"
        image="/images/empty/error.webp"
        title="We couldn't load your profile"
        description="Check your connection and refresh the page."
      />
    );
  }
  if (!profile || !me) {
    return <Skeleton aria-busy className="page-container my-14 h-[40rem] max-w-5xl rounded-2xl" />;
  }
  return <ProfileEditor me={me} profile={profile} />;
}
