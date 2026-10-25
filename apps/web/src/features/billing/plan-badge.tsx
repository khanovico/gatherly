import type { Me } from '@gatherly/shared';
import { Gem } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/** Free, Premium or Admin, for the header menu and billing page. */
export function PlanBadge({ me }: { me: Me }) {
  if (me.user.role === 'admin') return <Badge variant="outline">Admin</Badge>;
  return me.plan === 'premium' ? (
    <Badge className="bg-brand">
      <Gem /> Premium
    </Badge>
  ) : (
    <Badge variant="secondary">Free</Badge>
  );
}
