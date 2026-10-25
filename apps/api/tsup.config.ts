import { execSync } from 'node:child_process';
import { defineConfig } from 'tsup';

// Replit adds an empty "Published your App" commit on every publish; report the last real one.
const gitSha = () => {
  try {
    return execSync('git log -1 --format=%h --invert-grep --grep=^Replit-Commit-Author:')
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
};

export default defineConfig({
  entry: ['src/server.ts', 'src/migrate.ts', 'src/telemetry.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  clean: true,
  // Shared exports TypeScript source, so it is compiled into the bundle instead of imported at runtime.
  noExternal: ['@gatherly/shared'],
  env: { GIT_SHA: gitSha(), BUILD_TIME: new Date().toISOString() },
});
