import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Local runs read the root .env; CI provides the variables itself.
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      LOG_LEVEL: 'silent',
      DEMO_MODE: 'true',
    },
    // Test files share one database.
    fileParallelism: false,
  },
});
