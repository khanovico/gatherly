import { TriangleAlert } from 'lucide-react';
import { PagePlaceholder } from '@/components/page-placeholder';

export function ErrorBoundary() {
  return <PagePlaceholder title="Something went wrong" icon={TriangleAlert} />;
}
