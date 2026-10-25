import type { LucideIcon } from 'lucide-react';

/** Stand-in for a page that has not been built yet. Delete once every page is real. */
export function PagePlaceholder({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <section className="page-container flex flex-col items-center py-28 text-center">
      <div className="bg-brand text-primary-foreground shadow-primary/30 grid size-14 place-items-center rounded-2xl shadow-lg">
        <Icon className="size-6" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        This page is on its way. Explore the rest of Gatherly in the meantime.
      </p>
    </section>
  );
}
