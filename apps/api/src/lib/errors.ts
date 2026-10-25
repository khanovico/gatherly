import { STATUS_CODES } from 'node:http';
import type { ErrorCode, Problem } from '@gatherly/shared';
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
    if (body.status >= 500) request.log.error({ err: error }, 'request failed');
    return reply.status(body.status).type('application/problem+json').send(body);
  });
};

/** 404 for unknown API routes. Scoped to `/api` so the SPA fallback can own the rest. */
export const registerApiNotFound = (api: FastifyInstance) => {
  api.setNotFoundHandler((request, reply) =>
    reply
      .status(404)
      .type('application/problem+json')
      .send(problem(404, 'NOT_FOUND', `No route for ${request.method} ${request.url}`)),
  );
};
