import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/public-api/**/*.test.ts'],
  },
});
