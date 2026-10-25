import { execSync } from 'node:child_process';
import { defineConfig } from 'tsup';

const gitSha = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
};

export default defineConfig({
  entry: ['src/server.ts', 'src/migrate.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  clean: true,
  // Shared exports TypeScript source, so it is compiled into the bundle instead of imported at runtime.
  noExternal: ['@gatherly/shared'],
  env: { GIT_SHA: gitSha(), BUILD_TIME: new Date().toISOString() },
});
