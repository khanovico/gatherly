import { CATEGORIES } from '@gatherly/shared';
import { ArrowRight, CalendarCheck, Compass, Sparkles, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { DiscoverRails } from '@/features/discover/rails';
import { categoryMeta } from '@/features/events/lib';

const steps: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Compass,
    title: 'Discover',
    text: 'Browse meetups, workshops and outings by topic, date or keyword.',
  },
  {
    icon: CalendarCheck,
    title: 'Grab a seat',
    text: 'Register in one click. Live seat counts mean no surprises at the door.',
  },
  {
    icon: Sparkles,
    title: 'Host your own',
    text: 'Go Premium to publish events, track capacity and manage attendees.',
  },
];

export function Component() {
  return (
    <>
      <Hero />
      <FeaturedEvents />
      <Categories />
      <section className="page-container py-16">
        <h2 className="text-center text-3xl font-semibold">How Gatherly works</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="bg-card rounded-2xl border p-6 shadow-xs">
              <div className="bg-accent text-accent-foreground grid size-11 place-items-center rounded-xl">
                <Icon aria-hidden className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {title}
              </h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="page-container pb-20">
        <div className="bg-brand relative overflow-hidden rounded-3xl text-white px-6 py-12 text-center shadow-xl sm:px-12">
          <h2 className="text-3xl font-semibold">Bring your community together</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">
            Publish your first event in minutes. Premium organizers get capacity tracking and
            attendee management built in.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link to="/pricing">
              See plans <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <img
        src="/images/hero/hero.webp"
        alt=""
        fetchPriority="high"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/85 via-black/60 to-black/20" />
      <div className="page-container py-24 text-white sm:py-32 lg:py-40">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur">
          <Sparkles aria-hidden className="size-4" /> Community events, beautifully organized
        </p>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold sm:text-6xl">
          Find your people. <span className="text-brand brightness-150">Gather</span> in real life.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-white/80">
          Workshops, meetups, hikes and supper clubs hosted by people near you, or online. Reserve a
          seat in seconds.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-brand shadow-lg hover:opacity-90">
            <Link to="/events">
              Explore events <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
          >
            <Link to="/organizer/events/new">Host an event</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeaturedEvents() {
  return (
    <div className="page-container space-y-14 py-16">
      <DiscoverRails />
    </div>
  );
}

function Categories() {
  return (
    <section className="bg-muted/40 border-y py-16">
      <div className="page-container">
        <h2 className="text-3xl font-semibold">Explore by interest</h2>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.map((category) => {
            const { label, icon: Icon } = categoryMeta[category];
            return (
              <li key={category}>
                <Link
                  to={`/events?category=${category}`}
                  className="group relative isolate flex aspect-4/3 items-end overflow-hidden rounded-2xl p-4 text-white shadow-sm"
                >
                  <img
                    src={`/images/covers/${category}-1.webp`}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 -z-10 size-full object-cover transition duration-500 group-hover:scale-110"
                  />
                  <span className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 to-black/0" />
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon aria-hidden className="size-4" /> {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
