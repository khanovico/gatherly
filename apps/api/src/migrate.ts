import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { config } from './config';
import { createDb, type Db } from './db/client';

// Sits one level below the package root in both src/ and dist/, so this path works in either.
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

export const runMigrations = (db: Db) => migrate(db, { migrationsFolder });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = createDb(config.DATABASE_URL);
  await runMigrations(db);
  await db.$client.end();
}
