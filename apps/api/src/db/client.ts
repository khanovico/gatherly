import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const createDb = (connectionString: string) =>
  drizzle({ connection: { connectionString }, schema, casing: 'snake_case' });

export type Db = ReturnType<typeof createDb>;
