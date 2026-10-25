import { IllustratedState } from '@/components/illustrated-state';
import { RequireSignIn } from '@/components/require-entitlement';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingWizard } from '@/features/profile/onboarding-wizard';
import { useProfile } from '@/features/profile/queries';
import { useMe } from '@/hooks/use-me';

export function Component() {
  return (
    <RequireSignIn>
      <Onboarding />
    </RequireSignIn>
  );
}

function Onboarding() {
  const { data: me } = useMe();
  const { data: profile, isError } = useProfile();

  if (isError) {
    return (
      <IllustratedState
        as="h1"
        image="/images/empty/error.webp"
        title="We couldn't load your preferences"
        description="Check your connection and refresh the page."
      />
    );
  }
  if (!profile || !me) {
    return <Skeleton aria-busy className="page-container my-12 h-[32rem] max-w-5xl rounded-2xl" />;
  }
  return <OnboardingWizard profile={profile} firstName={me.user.name.split(' ')[0]!} />;
}
