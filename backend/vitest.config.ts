import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Load test env (e.g. backend/test/.env with TEST_DATABASE_URL) from ./test,
  // NOT backend/.env — so the production DATABASE_URL is never auto-loaded.
  envDir: './test',
  resolve: {
    alias: [
      // Backend source uses NodeNext-style ".js" extensions on relative imports
      // (the project compiles to CommonJS via tsc). Strip the ".js" so Vitest
      // resolves the real ".ts" source. Only relative imports are touched —
      // bare/node_modules specifiers (e.g. @prisma/client) are unaffected.
      { find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1' },
    ],
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    // Isolation tests share one seeded dataset and must not race each other.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
