import { ChevronDown, CreditCard, LogIn, LogOut, Ticket } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { personaInfo } from '@/features/auth/personas';
import { PlanBadge } from '@/features/billing/plan-badge';
import { useDemoLogin, usePersonas, useSignOut } from '@/features/auth/use-demo-login';
import { useMe } from '@/hooks/use-me';

const UserAvatar = ({ name, src, size }: { name: string; src: string | null; size?: 'lg' }) => (
  <Avatar size={size}>
    <AvatarImage src={src ?? undefined} alt="" />
    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
  </Avatar>
);

/** Header identity slot: sign-in button, or the current persona with switch and sign-out. */
export function PersonaSwitcher() {
  const { data: me, isPending } = useMe();
  const { data: personas = [] } = usePersonas();
  const login = useDemoLogin();
  const signOut = useSignOut();

  if (isPending) return <Skeleton className="size-8 rounded-full" />;
  if (!me) {
    return (
      <Button asChild variant="outline">
        <Link to="/signin">
          <LogIn /> Sign in
        </Link>
      </Button>
    );
  }
  const { user } = me;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="rounded-full px-1 lg:pr-3"
          aria-label={`Account menu for ${user.name}`}
        >
          <UserAvatar name={user.name} src={user.avatarUrl} />
          <span className="hidden lg:inline">{user.name}</span>
          <ChevronDown className="text-muted-foreground hidden lg:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <UserAvatar name={user.name} src={user.avatarUrl} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="text-foreground block truncate font-medium">{user.name}</span>
            <span className="block truncate text-xs font-normal">{user.email}</span>
          </span>
          <PlanBadge me={me} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch persona</DropdownMenuLabel>
          {personas
            .filter((card) => card.user.id !== user.id)
            .map(({ persona, user: other }) => (
              <DropdownMenuItem key={persona} onSelect={() => login.mutate(persona)}>
                <UserAvatar name={other.name} src={other.avatarUrl} />
                {other.name}
                <span className="text-muted-foreground ml-auto text-xs">
                  {personaInfo[persona].badge}
                </span>
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/me/registrations">
            <Ticket /> My tickets
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings/billing">
            <CreditCard /> Plan & billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut.mutate()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
