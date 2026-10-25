import { Compass, Gem } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { premiumPerks } from '@/features/billing/perks';

/** Paywall shown in place of a Premium-only page. */
export function UpgradePrompt() {
  return (
    <section className="page-container py-12 sm:py-20">
      <div className="bg-card grid overflow-hidden rounded-3xl border shadow-sm md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6 p-8 sm:p-12">
          <Badge className="bg-brand text-primary-foreground w-fit">
            <Gem /> Premium feature
          </Badge>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Bring your community together with <span className="text-brand">Premium</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Creating events is part of the Premium plan. Upgrade to start hosting.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {premiumPerks.map(({ icon: Icon, title, description, comingSoon }) => (
              <li key={title} className="flex gap-3">
                <span className="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-lg">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    {title}
                    {comingSoon && <Badge variant="secondary">Soon</Badge>}
                  </span>
                  <span className="text-muted-foreground text-sm">{description}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-brand hover:opacity-90">
              <Link to="/pricing">
                <Gem /> See Premium plans
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/events">
                <Compass /> Keep exploring
              </Link>
            </Button>
          </div>
        </div>
        <img
          src="/images/covers/community-1.webp"
          alt=""
          className="hidden size-full object-cover md:block"
        />
      </div>
    </section>
  );
}
