import type { Me } from '@gatherly/shared';
import {
  Compass,
  Gem,
  LayoutDashboard,
  Menu,
  Plus,
  ShieldCheck,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Logo } from '@/components/logo';
import { PersonaSwitcher } from '@/components/persona-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { hasEntitlement, useMe } from '@/hooks/use-me';
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; icon: LucideIcon };

function navItems(me: Me | null | undefined, canHost: boolean): NavItem[] {
  return [
    { to: '/events', label: 'Discover', icon: Compass },
    ...(me ? [{ to: '/me/registrations', label: 'My tickets', icon: Ticket }] : []),
    ...(canHost ? [{ to: '/organizer', label: 'Organizer', icon: LayoutDashboard }] : []),
    ...(me?.user.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
    ...(canHost ? [] : [{ to: '/pricing', label: 'Pricing', icon: Gem }]),
  ];
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-accent text-accent-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );

export function SiteHeader() {
  const { data: me } = useMe();
  const canHost = hasEntitlement(me, 'events:create');
  const items = navItems(me, canHost);
  const createItem = { to: '/organizer/events/new', label: 'Create event', icon: Plus };
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="bg-background/70 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="page-container flex h-16 items-center gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {items.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {canHost && (
            <Button asChild className="bg-brand hidden shadow-sm hover:opacity-90 sm:inline-flex">
              <Link to="/organizer/events/new">
                <Plus /> Create event
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <PersonaSwitcher />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-4">
              <SheetTitle className="text-muted-foreground px-3 text-sm">Menu</SheetTitle>
              <nav aria-label="Mobile" className="mt-4 flex flex-col gap-1">
                {(canHost ? [...items, createItem] : items).map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} end onClick={closeMenu} className={linkClass}>
                    <Icon className="size-4" /> {label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
