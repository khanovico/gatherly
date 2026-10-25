import { z } from 'zod';
import { ErrorCode } from './enums';

/** ISO 8601 instant with offset, e.g. `2026-11-01T18:00:00Z`. All instants on the wire use this. */
export const isoDateTime = z.iso.datetime({ offset: true });

export const problem = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int(),
  detail: z.string().optional(),
  code: ErrorCode,
  /** Field-level issues, present when `code` is `VALIDATION_FAILED`. */
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type Problem = z.infer<typeof problem>;

/** `?page&pageSize` on every list endpoint: 1-based, at most 50 per page. */
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.int().min(1),
    pageSize: z.int().min(1),
    total: z.int().min(0),
  });
export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number };
