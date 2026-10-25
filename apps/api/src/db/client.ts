import { drizzle } from 'drizzle-orm/node-postgres';

export const createDb = (connectionString: string) =>
  drizzle({ connection: { connectionString }, casing: 'snake_case' });

export type Db = ReturnType<typeof createDb>;
