import { STATUS_CODES } from 'node:http';
import type { ErrorCode, Problem } from '@gatherly/shared';
import * as Sentry from '@sentry/node';
import type { FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    readonly detail?: string,
  ) {
    super(detail ?? code);
    this.name = 'AppError';
  }
}

const problem = (
  status: number,
  code: ErrorCode,
  detail?: string,
  errors?: Problem['errors'],
): Problem => ({
  type: 'about:blank',
  title: STATUS_CODES[status] ?? 'Error',
  status,
  code,
  ...(detail && { detail }),
  ...(errors && { errors }),
});

const codeForStatus: Partial<Record<number, ErrorCode>> = {
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
};

const toProblem = (error: unknown): Problem => {
  if (error instanceof AppError) return problem(error.status, error.code, error.detail);
  if (hasZodFastifySchemaValidationErrors(error)) {
    const errors = error.validation.map((issue) => ({
      path: issue.instancePath.slice(1).replaceAll('/', '.'),
      message: issue.message ?? 'Invalid value',
    }));
    return problem(400, 'VALIDATION_FAILED', `Invalid ${error.validationContext}`, errors);
  }
  if (error instanceof ZodError) {
    const errors = error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return problem(400, 'VALIDATION_FAILED', 'Invalid input', errors);
  }
  // Postgres rejects NUL characters in text (22021). Bad input, not a server fault.
  if ((error as { cause?: { code?: string } }).cause?.code === '22021')
    return problem(400, 'VALIDATION_FAILED', 'Text must not contain NUL characters');
  const status = (error as { statusCode?: number }).statusCode;
  if (status && status < 500) {
    const message = error instanceof Error ? error.message : undefined;
    return problem(status, codeForStatus[status] ?? 'VALIDATION_FAILED', message);
  }
  return problem(500, 'INTERNAL');
};

/** Every error leaves the API as `application/problem+json` with a stable `code`. */
export const registerErrorHandling = (app: FastifyInstance) => {
  app.setErrorHandler((error, request, reply) => {
    const body = toProblem(error);
    if (body.status >= 500) {
      request.log.error({ err: error }, 'request failed');
      Sentry.captureException(error);
    }
    return reply.status(body.status).type('application/problem+json').send(body);
  });
};

/**
 * 404 for unknown API routes, 405 (with `Allow`) when the path exists under other methods.
 * Scoped to `/api` so the SPA fallback can own the rest.
 */
export const registerApiNotFound = (api: FastifyInstance) => {
  const routes: { pattern: RegExp; methods: string[] }[] = [];
  api.addHook('onRoute', ({ url, method }) => {
    const source = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:\w+/g, '[^/]+');
    routes.push({ pattern: new RegExp(`^${source}$`), methods: [method].flat() });
  });
  api.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0]!;
    const allowed = routes.filter((r) => r.pattern.test(path)).flatMap((r) => r.methods);
    const [status, code] = allowed.length
      ? ([405, 'METHOD_NOT_ALLOWED'] as const)
      : ([404, 'NOT_FOUND'] as const);
    if (allowed.length) reply.header('allow', [...new Set(allowed)].join(', '));
    return reply
      .status(status)
      .type('application/problem+json')
      .send(problem(status, code, `No route for ${request.method} ${path}`));
  });
};
