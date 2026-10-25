import * as Sentry from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bug, Check, Clock, Copy, Database, ExternalLink, GitCommit } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { observabilityLinks } from './observability-links';

type Version = { gitSha: string; buildTime: string | null; uptimeSeconds: number };
type TestErrors = { traceId: string | null; webEventId: string; apiEventId: string };

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/** A browser error and the API's test error inside one span, so both land on the same trace. */
const triggerTestErrors = () =>
  Sentry.startSpan({ name: 'admin.trigger-test-error', op: 'diagnostics' }, async () => {
    const error = new Error('Diagnostic test error triggered in the browser');
    error.name = 'DiagnosticTestError';
    const webEventId = Sentry.captureException(error);
    const res = await fetch('/api/v1/admin/diagnostics/error', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (res.status !== 500) throw new Error(body.detail ?? 'Could not trigger the API test error.');
    return { traceId: body.traceId, webEventId, apiEventId: body.sentryEventId } as TestErrors;
  });

export function ObservabilityTab() {
  const version = useQuery({
    queryKey: queryKeys.admin.version,
    queryFn: () => apiFetch<Version>('/version'),
    refetchInterval: 15_000,
  });
  const ready = useQuery({
    queryKey: queryKeys.admin.ready,
    queryFn: () => apiFetch('/readyz').then(() => true),
    refetchInterval: 15_000,
    retry: false,
  });
  const trigger = useMutation({
    mutationFn: triggerTestErrors,
    onError: (err) => toast.error(err.message),
  });

  const v = version.data;
  const status = [
    {
      label: 'Version',
      value: v?.gitSha ?? '…',
      hint: v?.buildTime ? `Built ${new Date(v.buildTime).toLocaleString()}` : 'Build time unknown',
      icon: GitCommit,
    },
    {
      label: 'Database',
      value: ready.isError ? 'Unavailable' : ready.data ? 'Ready' : '…',
      hint: 'Live /readyz check every 15 s',
      icon: Database,
    },
    {
      label: 'Uptime',
      value: v ? formatUptime(v.uptimeSeconds) : '…',
      hint: 'Since this instance started (it scales to zero when idle)',
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-3">
        {status.map(({ label, value, hint, icon: Icon }) => (
          <li key={label}>
            <Card className="h-full gap-2 p-5">
              <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4" aria-hidden /> {label}
              </span>
              <p
                className={cn(
                  'font-mono text-2xl font-semibold',
                  value === 'Unavailable' && 'text-destructive',
                )}
              >
                {value}
              </p>
              <p className="text-muted-foreground text-xs">{hint}</p>
            </Card>
          </li>
        ))}
      </ul>

      {observabilityLinks.length > 0 && (
        <Card className="gap-4 p-5">
          <div>
            <h2 className="font-semibold">Public telemetry</h2>
            <p className="text-muted-foreground text-sm">
              Read-only views anyone can open, no account needed.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {observabilityLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:bg-muted flex h-full items-start justify-between gap-3 rounded-lg border p-3 transition-colors"
                >
                  <span>
                    <span className="font-medium">{link.label}</span>
                    <span className="text-muted-foreground block text-sm">{link.description}</span>
                  </span>
                  <ExternalLink
                    className="text-muted-foreground mt-1 size-4 shrink-0"
                    aria-hidden
                  />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-prose">
            <h2 className="font-semibold">Trigger a test error</h2>
            <p className="text-muted-foreground text-sm">
              Sends one error from this browser and one from the API, on the same trace. Look the
              IDs up in Sentry, or the trace ID in the Grafana logs and traces panels.
            </p>
          </div>
          <Button onClick={() => trigger.mutate()} disabled={trigger.isPending}>
            <Bug aria-hidden /> {trigger.isPending ? 'Sending…' : 'Trigger test error'}
          </Button>
        </div>
        {trigger.data && (
          <dl className="grid gap-2 sm:grid-cols-3">
            <IdRow label="Trace ID" value={trigger.data.traceId} />
            <IdRow label="Sentry event (web)" value={trigger.data.webEventId} />
            <IdRow label="Sentry event (API)" value={trigger.data.apiEventId} />
          </dl>
        )}
      </Card>
    </div>
  );
}

function IdRow({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="truncate font-mono text-sm">{value ?? 'Telemetry off'}</dd>
      </div>
      {value && (
        <Button variant="ghost" size="icon-sm" aria-label={`Copy ${label}`} onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        </Button>
      )}
    </div>
  );
}
