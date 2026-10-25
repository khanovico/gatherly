import type { ErrorCode, Problem } from '@gatherly/shared';

/** A non-2xx API response, parsed from its `application/problem+json` body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly detail?: string,
    readonly errors: NonNullable<Problem['errors']> = [],
  ) {
    super(detail ?? code);
    this.name = 'ApiError';
  }
}

type ApiInit = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: Record<string, string>;
};

/** Calls `/api/v1{path}`. A `body` is sent as JSON; a 204 resolves to `undefined`. */
export async function apiFetch<T>(path: string, { body, headers, ...init }: ApiInit = {}) {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const statusCodes: Record<number, ErrorCode> = {
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
};

async function toApiError(res: Response) {
  const problem = (await res.json().catch(() => null)) as Partial<Problem> | null;
  const code = problem?.code ?? statusCodes[res.status] ?? 'INTERNAL';
  return new ApiError(res.status, code, problem?.detail, problem?.errors);
}

const messages: Partial<Record<ErrorCode, string>> = {
  UNAUTHENTICATED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have access to do that.",
  ENTITLEMENT_REQUIRED: 'Upgrade to Premium to unlock this.',
  ACCOUNT_SUSPENDED: 'Your account is suspended.',
  NOT_FOUND: "We couldn't find that.",
  EVENT_FULL: 'This event just filled up.',
  EVENT_STARTED: 'This event has already started.',
  EVENT_CANCELLED: 'This event was cancelled.',
  ALREADY_REGISTERED: "You're already registered for this event.",
  PROTECTED_DEMO_ACCOUNT: 'Demo personas are protected and cannot be changed.',
  COMING_SOON: 'Coming soon — this is not available yet.',
};

/** User-facing copy for any thrown error: known codes first, then the API's detail. */
export function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'Network error. Check your connection and try again.';
  return messages[error.code] ?? error.detail ?? 'Something went wrong. Please try again.';
}
