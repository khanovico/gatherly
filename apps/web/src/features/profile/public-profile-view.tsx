import type { PublicProfile } from '@gatherly/shared';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Pencil } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { IllustratedState } from '@/components/illustrated-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryBadge } from '@/features/events/category-badge';
import { EventCard } from '@/features/events/event-card';
import { ProfileAvatar } from '@/features/profile/profile-avatar';
import { useMe } from '@/hooks/use-me';

type Tab = 'hosting' | 'attending';

/** Cover banner from the member's top interest, identity, interests and their upcoming events. */
export function PublicProfileView({ profile }: { profile: PublicProfile }) {
  const { data: me } = useMe();
  const [params, setParams] = useSearchParams();
  const firstName = profile.name.split(' ')[0];
  const tabs: Record<Tab, { label: string; events: PublicProfile['hosting']; empty: string }> = {
    hosting: {
      label: 'Hosting',
      events: profile.hosting,
      empty: `${firstName} isn't hosting anything coming up.`,
    },
    attending: {
      label: 'Attending',
      events: profile.attending,
      empty: `${firstName} hasn't joined any upcoming events.`,
    },
  };
  const tab: Tab =
    params.get('tab') === 'attending' || (!params.get('tab') && !profile.hosting.length)
      ? 'attending'
      : 'hosting';

  return (
    <div className="page-container max-w-6xl py-6 sm:py-10">
      <div className="relative h-40 overflow-hidden rounded-3xl sm:h-64">
        <img
          src={`/images/covers/${profile.interests[0] ?? 'community'}-2.webp`}
          alt=""
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="px-2 sm:px-8">
        <div className="-mt-12 flex items-end justify-between gap-4 sm:-mt-16">
          <ProfileAvatar
            user={profile}
            className="ring-background relative size-24 text-3xl ring-4 sm:size-32 sm:text-4xl"
          />
          {me?.user.id === profile.id && (
            <Button asChild variant="outline">
              <Link to="/profile">
                <Pencil /> Edit profile
              </Link>
            </Button>
          )}
        </div>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{profile.name}</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
          <CalendarDays aria-hidden className="size-4" />
          Member since {format(parseISO(profile.memberSince), 'MMMM yyyy')}
        </p>
        {profile.bio && <p className="mt-4 max-w-2xl text-lg leading-relaxed">{profile.bio}</p>}
        {profile.interests.length > 0 && (
          <ul aria-label="Interests" className="mt-5 flex flex-wrap gap-2">
            {profile.interests.map((category) => (
              <li key={category}>
                <CategoryBadge category={category} className="px-3 py-1 text-sm" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setParams({ tab: value }, { replace: true })}
        className="mt-10"
      >
        <TabsList>
          {(Object.keys(tabs) as Tab[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {tabs[key].label}
              <span className="text-muted-foreground tabular-nums">{tabs[key].events.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-6">
          {tabs[tab].events.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tabs[tab].events.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} className="h-full" />
                </li>
              ))}
            </ul>
          ) : (
            <IllustratedState
              image="/images/empty/no-events.webp"
              title="Nothing here yet"
              description={tabs[tab].empty}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
