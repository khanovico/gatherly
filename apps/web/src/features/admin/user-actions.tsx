import type { AdminUser, AdminUserPatch } from '@gatherly/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CircleCheck,
  Gem,
  MoreHorizontal,
  ShieldCheck,
  ShieldMinus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Fragment } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ApiError, apiFetch, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

type Action = { label: string; icon: LucideIcon; patch: AdminUserPatch; done: string };

/** Role and plan first; the status change sits last, after a separator. */
const actions = (user: AdminUser): Action[] => [
  user.role === 'admin'
    ? {
        label: 'Make member',
        icon: ShieldMinus,
        patch: { role: 'member' },
        done: 'is now a member',
      }
    : { label: 'Make admin', icon: ShieldCheck, patch: { role: 'admin' }, done: 'is now an admin' },
  user.plan === 'premium'
    ? { label: 'Revoke Premium', icon: X, patch: { plan: 'free' }, done: 'moved to Free' }
    : {
        label: 'Grant Premium',
        icon: Gem,
        patch: { plan: 'premium' },
        done: 'upgraded to Premium',
      },
  user.status === 'active'
    ? { label: 'Suspend', icon: Ban, patch: { status: 'suspended' }, done: 'suspended' }
    : { label: 'Reactivate', icon: CircleCheck, patch: { status: 'active' }, done: 'reactivated' },
];

/** Row menu for suspend / role / plan. Protected demo personas get a disabled trigger instead. */
export function UserActions({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: ({ patch }: Action) =>
      apiFetch<AdminUser>(`/admin/users/${user.id}`, { method: 'PATCH', body: patch }),
    onSuccess: (_, { done }) => {
      toast.success(`${user.name} ${done}`);
      return queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
    // The last-admin guard answers 403 with a specific reason; show it instead of generic copy.
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.code === 'FORBIDDEN' && error.detail
          ? error.detail
          : errorMessage(error),
      ),
  });
  const label = `Actions for ${user.name}`;

  if (user.protected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex rounded-md">
            <Button variant="ghost" size="icon-sm" disabled aria-label={label}>
              <MoreHorizontal />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Demo personas are protected so the demo keeps working</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} disabled={update.isPending}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions(user).map((action) => (
          <Fragment key={action.label}>
            {action.patch.status && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={action.patch.status === 'suspended' ? 'destructive' : 'default'}
              onSelect={() => update.mutate(action)}
            >
              <action.icon /> {action.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
