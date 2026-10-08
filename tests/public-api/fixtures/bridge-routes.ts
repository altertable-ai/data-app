import {
  dataAppRoutes,
  parseCount,
  defineMessageRoute,
} from '@altertable/data-app/contract';

export const bridgeRoutes = {
  ...dataAppRoutes,
  'test:wait': defineMessageRoute({ input: parseCount, output: parseCount }),
  'test:echo': defineMessageRoute({
    input(value: unknown): { period: string } {
      if (
        !value ||
        typeof value !== 'object' ||
        typeof (value as { period?: unknown }).period !== 'string'
      )
        throw new Error('Invalid echo payload.');

      return { period: (value as { period: string }).period };
    },
    output(value: unknown): { period: string; version: number } {
      if (!value || typeof value !== 'object')
        throw new Error('Invalid echo response.');
      const result = value as { period: string; version: number };
      if (
        typeof result.period !== 'string' ||
        typeof result.version !== 'number'
      )
        throw new Error('Invalid echo response.');

      return { period: result.period, version: result.version };
    },
  }),
};
