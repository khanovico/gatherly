import { Link } from 'react-router';
import { Logo } from '@/components/logo';

type FooterLink = { to: string; label: string; external?: boolean };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Explore',
    links: [
      { to: '/events', label: 'Discover events' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/organizer/events/new', label: 'Host an event' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/signin', label: 'Sign in' },
      { to: '/me/registrations', label: 'My tickets' },
      { to: '/settings/billing', label: 'Billing' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { to: '/api/docs', label: 'API reference', external: true },
      { to: 'https://github.com/khanovico/gatherly', label: 'Source code', external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-muted/40 border-t">
      <div className="page-container grid gap-10 py-14 md:grid-cols-[2fr_repeat(3,1fr)]">
        <div className="max-w-xs space-y-4">
          <Logo />
          <p className="text-muted-foreground text-sm leading-relaxed">
            Find your people. Discover community events near you or online, and host gatherings that
            fill up.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {column.links.map(({ to, label, external }) => (
                <li key={to}>
                  {external ? (
                    <a href={to} className="text-muted-foreground hover:text-foreground">
                      {label}
                    </a>
                  ) : (
                    <Link to={to} className="text-muted-foreground hover:text-foreground">
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="page-container text-muted-foreground flex flex-col gap-2 py-6 text-xs sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Gatherly. All rights reserved.</p>
          <p>Demo environment: data resets periodically and no real payments are taken.</p>
        </div>
      </div>
    </footer>
  );
}
