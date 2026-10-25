import { Persona } from '@gatherly/shared';
import { Check, Loader2, LogIn, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthCard } from '@/features/auth/auth-card';
import { personaInfo } from '@/features/auth/personas';
import { useDemoLogin, usePersonas } from '@/features/auth/use-demo-login';

/** Only same-site paths, so `?next=` cannot send people to another origin. */
const safeNext = (next: string | null) =>
  next?.startsWith('/') && !next.startsWith('//') ? next : undefined;

export function Component() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const login = useDemoLogin(next);
  const { data: personas } = usePersonas();

  return (
    <section className="page-container py-12 sm:py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <img src="/images/brand/mark.webp" alt="" className="mx-auto size-14 lg:mx-0" />
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
            Find your people, <span className="text-brand">one event at a time</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Sign in or create a free account. Tell us what you like and Discover picks events for
            you.
          </p>
        </div>
        <AuthCard initialMode={params.get('mode') === 'signup' ? 'signup' : 'signin'} next={next} />
      </div>

      <div className="mx-auto mt-20 max-w-3xl text-center">
        <Badge variant="secondary">
          <Sparkles /> Live demo · no password needed
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold">Try a demo account</h2>
        <p className="text-muted-foreground mt-2">
          Each persona is a real account with its own permissions. Switch any time from the header.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {personas?.map(({ persona, user }) => {
          const info = personaInfo[persona];
          return (
            <li key={persona}>
              <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-lg">
                <div className="bg-brand h-24" />
                <CardContent className="-mt-16 flex flex-1 flex-col items-center gap-4 text-center">
                  <img
                    src={user.avatarUrl ?? undefined}
                    alt=""
                    className="ring-card size-28 rounded-full shadow-md ring-4"
                  />
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold">{user.name}</h3>
                    <Badge variant="outline">{info.badge}</Badge>
                    <p className="text-muted-foreground pt-1 text-sm">{info.tagline}</p>
                  </div>
                  <ul className="w-full space-y-2 text-left text-sm">
                    {info.abilities.map((ability) => (
                      <li key={ability} className="flex gap-2">
                        <Check className="text-success mt-0.5 size-4 shrink-0" /> {ability}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    className="mt-auto w-full"
                    disabled={login.isPending}
                    onClick={() => login.mutate(persona)}
                  >
                    {login.isPending && login.variables === persona ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <LogIn />
                    )}
                    Continue as {user.name.split(' ')[0]}
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        }) ??
          Persona.options.map((persona) => (
            <Skeleton key={persona} className="h-[26rem] rounded-xl" />
          ))}
      </ul>
    </section>
  );
}
