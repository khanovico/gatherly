import { AppShell, ShellFallback } from '@/components/app-shell';
import { createTracedBrowserRouter } from '@/lib/sentry';
import { ErrorBoundary } from '@/pages/error';

/**
 * Every route, declared once. Each page is its own lazily loaded file in `src/pages/`
 * exporting `Component`, so feature work replaces a page file and never edits this table.
 */
export const router = createTracedBrowserRouter([
  {
    Component: AppShell,
    HydrateFallback: ShellFallback,
    ErrorBoundary,
    children: [
      {
        ErrorBoundary,
        children: [
          { index: true, lazy: () => import('@/pages/landing') },
          { path: 'events', lazy: () => import('@/pages/discover') },
          { path: 'events/:id', lazy: () => import('@/pages/event-detail') },
          { path: 'signin', lazy: () => import('@/pages/signin') },
          { path: 'me/registrations', lazy: () => import('@/pages/my-registrations') },
          { path: 'pricing', lazy: () => import('@/pages/pricing') },
          { path: 'settings/billing', lazy: () => import('@/pages/billing-settings') },
          { path: 'organizer', lazy: () => import('@/pages/organizer-dashboard') },
          { path: 'organizer/events/new', lazy: () => import('@/pages/organizer-event-new') },
          { path: 'organizer/events/:id/edit', lazy: () => import('@/pages/organizer-event-edit') },
          {
            path: 'organizer/events/:id/attendees',
            lazy: () => import('@/pages/organizer-attendees'),
          },
          { path: 'admin', lazy: () => import('@/pages/admin') },
          { path: '*', lazy: () => import('@/pages/not-found') },
        ],
      },
    ],
  },
]);
