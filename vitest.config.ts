import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
  test: {
    include: ['tests/public-api/**/*.test.ts'],
    testTimeout: 30000,
    expect: { poll: { timeout: 10000 } },
  },
});
