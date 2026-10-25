import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  GIT_SHA: z.string().default('dev'),
  BUILD_TIME: z.string().optional(),
  // Telemetry is off unless set. The OTel SDK also reads the OTEL_* values from the environment itself.
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  SENTRY_DSN_API: z.url().optional(),
});

// GIT_SHA and BUILD_TIME are named explicitly so the production build can inline them.
const parsed = envSchema.safeParse({
  ...process.env,
  GIT_SHA: process.env.GIT_SHA,
  BUILD_TIME: process.env.BUILD_TIME,
});
if (!parsed.success) throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);

export const config = parsed.data;
