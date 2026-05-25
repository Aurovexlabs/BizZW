import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: process.env.RUN_MONGO_TESTS !== '1',
    include: ['src/test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/test/'],
    },
    setupFiles: ['./src/test/setup.ts'],
    hookTimeout: 30000,
    testTimeout: 15000,
  },
});
