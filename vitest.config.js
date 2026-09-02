import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    // tests/e2e roda no Playwright (`npm run test:e2e`), não no vitest
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
});
