import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-8"
      />
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground tabular-nums">
        {first}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
