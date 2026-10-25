import type { UserSummary } from '@gatherly/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/** Any-size avatar; members without a photo get their initials on the brand gradient. */
export function ProfileAvatar({
  user,
  className,
}: {
  user: Pick<UserSummary, 'name' | 'avatarUrl'>;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
      <AvatarFallback className="bg-brand text-[length:inherit] font-semibold text-white">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}
