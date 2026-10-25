/** Public, read-only telemetry views for reviewers who have no Grafana or Sentry account. */
export const observabilityLinks: { label: string; description: string; url: string }[] = [
  {
    label: 'Grafana dashboard',
    description: 'Request rate, errors and latency by route, business counters, recent logs',
    url: 'https://lankyholly1972.grafana.net/public-dashboards/9402737b590a4f538536e6057470aeba',
  },
  {
    label: 'Sentry: browser error',
    description: 'A diagnostic error from the web app, with its trace',
    url: 'https://khandev-s1.sentry.io/share/issue/5d7cc0bd2b5a4701aba7387a0b4b86d1/',
  },
  {
    label: 'Sentry: API error',
    description: 'The API error from the same trace, with stack trace and request',
    url: 'https://khandev-s1.sentry.io/share/issue/25e21197641d4401a8ebfddb8027efa0/',
  },
];
