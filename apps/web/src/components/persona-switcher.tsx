import { LogIn } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useMe } from '@/hooks/use-me';

/** Header identity slot: sign-in button or the current persona. */
export function PersonaSwitcher() {
  const { data: me } = useMe();
  if (!me) {
    return (
      <Button asChild variant="outline">
        <Link to="/signin">
          <LogIn /> Sign in
        </Link>
      </Button>
    );
  }
  return (
    <Link to="/signin" className="flex items-center gap-2 rounded-full" title="Switch persona">
      <Avatar>
        <AvatarImage src={me.user.avatarUrl ?? undefined} alt="" />
        <AvatarFallback>{me.user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <span className="hidden text-sm font-medium lg:inline">{me.user.name}</span>
    </Link>
  );
}
