import type { AdminUser, Paginated } from '@gatherly/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Gem, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toSearchParams, useDebounced } from '@/features/admin/lib';
import { Pager, SearchField } from '@/features/admin/list-controls';
import { UserActions } from '@/features/admin/user-actions';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const pageSize = 10;

export function UsersTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = { q: useDebounced(search.trim()), page, pageSize };
  const { data, isError } = useQuery({
    queryKey: queryKeys.admin.users(query),
    queryFn: () => apiFetch<Paginated<AdminUser>>(`/admin/users?${toSearchParams(query)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <SearchField
        label="Search name or email"
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </TableBody>
        </Table>
        {data?.total === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <img src="/images/empty/no-results.webp" alt="" className="size-32" />
            <p className="font-medium">No members match “{query.q}”</p>
          </div>
        )}
        {!data && !isError && <Skeleton className="m-4 h-60" />}
        {isError && <p className="text-muted-foreground p-8 text-center">Couldn't load members.</p>}
      </Card>
      {!!data?.total && (
        <Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <TableRow>
      <TableCell className="pl-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
            <AvatarFallback aria-hidden className="bg-accent text-accent-foreground">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              {user.name}
              {user.protected && (
                <Badge variant="secondary">
                  <Lock aria-hidden /> Demo persona
                </Badge>
              )}
            </p>
            <p className="text-muted-foreground truncate text-sm">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {user.role === 'admin' ? (
          <Badge className="bg-accent text-accent-foreground">
            <ShieldCheck aria-hidden /> Admin
          </Badge>
        ) : (
          <span className="text-muted-foreground">Member</span>
        )}
      </TableCell>
      <TableCell>
        {user.plan === 'premium' ? (
          <Badge className="bg-brand text-primary-foreground">
            <Gem aria-hidden /> Premium
          </Badge>
        ) : (
          <Badge variant="outline">Free</Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={user.status === 'active' ? 'outline' : 'destructive'}>
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {user.status === 'active' ? 'Active' : 'Suspended'}
        </Badge>
      </TableCell>
      <TableCell className="pr-4 text-right">
        <UserActions user={user} />
      </TableCell>
    </TableRow>
  );
}
