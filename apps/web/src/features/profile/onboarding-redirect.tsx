import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useProfile } from '@/features/profile/queries';
import { useMe } from '@/hooks/use-me';

/**
 * Sends a signed-in member who has not onboarded to `/onboarding` once per browser. Leaving the
 * wizard without finishing or skipping is respected: they are not sent back.
 */
export function OnboardingRedirect() {
  const { data: me } = useMe();
  const { data: profile } = useProfile({ enabled: !!me });
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!me || !profile || profile.onboardedAt) return;
    const key = `gatherly:onboarding-offered:${me.user.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      return; // Storage blocked: never redirect rather than redirect on every visit.
    }
    if (pathname !== '/onboarding') navigate('/onboarding', { replace: true });
  }, [me, profile, pathname, navigate]);

  return null;
}
