import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'public-api',
          include: ['tests/public-api/**/*.test.{ts,tsx}'],
          exclude: ['tests/public-api/apps-starters.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'starters',
          include: ['tests/public-api/apps-starters.test.ts'],
          env: { DATA_APP_STARTER_MOCK: '1' },
        },
      },
      {
        extends: true,
        test: { name: 'release', include: ['tests/release/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'time-interval',
          include: ['tests/vendor/d3-time/**/*.test.{js,ts}'],
          pool: 'forks',
          env: { TZ: 'America/Los_Angeles' },
        },
      },
    ],
    testTimeout: 30000,
    expect: { poll: { timeout: 10000 } },
  },
});
