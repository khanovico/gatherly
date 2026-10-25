import { Persona } from '@gatherly/shared';
import { Check, Loader2, LogIn, Sparkles, UserPlus } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { ComingSoonDialog } from '@/components/coming-soon-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { personaInfo } from '@/features/auth/personas';
import { useDemoLogin, usePersonas } from '@/features/auth/use-demo-login';

/** Only same-site paths, so `?next=` cannot send people to another origin. */
const safeNext = (next: string | null) =>
  next?.startsWith('/') && !next.startsWith('//') ? next : undefined;

export function Component() {
  const [params] = useSearchParams();
  const login = useDemoLogin(safeNext(params.get('next')));
  const { data: personas } = usePersonas();

  return (
    <section className="page-container py-12 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary">
          <Sparkles /> Live demo · no password needed
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
          Choose who you want <span className="text-brand">to be today</span>
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
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
                    <h2 className="text-xl font-semibold">{user.name}</h2>
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

      <p className="text-muted-foreground mt-10 text-center text-sm">
        Want your own account?
        <ComingSoonDialog
          title="Sign-up is on the way"
          description="Real accounts will use a hosted identity provider (single sign-on, passwords, email verification). Until then, explore Gatherly with the demo personas."
          trigger={
            <Button variant="link" className="ml-1 h-auto p-0">
              <UserPlus /> Sign up
            </Button>
          }
        />
      </p>
    </section>
  );
}
