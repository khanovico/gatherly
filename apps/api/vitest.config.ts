import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Local runs read the root .env; CI provides the variables itself. Without either, tests use the
// gatherly_test database that `docker compose up -d db` creates.
if (existsSync('../../.env')) process.loadEnvFile('../../.env');
const composeTestDb = `postgres://gatherly:gatherly@localhost:${process.env.DB_PORT ?? 54329}/gatherly_test`;

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? composeTestDb,
      LOG_LEVEL: 'silent',
      DEMO_MODE: 'true',
      // Short, so the lock-timeout test does not wait three seconds.
      SEAT_LOCK_TIMEOUT_MS: '300',
    },
    // Test files share one database.
    fileParallelism: false,
  },
});
