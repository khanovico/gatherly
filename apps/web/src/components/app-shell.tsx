import { Outlet, ScrollRestoration, useNavigation } from 'react-router';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { OnboardingRedirect } from '@/features/profile/onboarding-redirect';

export function AppShell() {
  const navigating = useNavigation().state !== 'idle';
  return (
    <div className="relative isolate flex min-h-svh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]"
      />
      {navigating && (
        <div
          className="bg-brand fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse"
          role="progressbar"
        />
      )}
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
      <OnboardingRedirect />
    </div>
  );
}

/** Shown while the first page chunk loads. */
export function ShellFallback() {
  return (
    <div className="grid min-h-svh place-items-center">
      <img src="/images/brand/mark.webp" alt="Loading Gatherly" className="size-12 animate-pulse" />
    </div>
  );
}
