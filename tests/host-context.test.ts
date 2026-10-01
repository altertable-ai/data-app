import { expect, test } from 'bun:test';
import { createThemeController } from '@/src/core/appearance';
import { parseHostContext } from '@/src/core/host-context';

test('host context accepts only known surfaces and resolved schemes', () => {
  expect(
    parseHostContext({ surface: 'altertable', colorScheme: 'dark' })
  ).toEqual({ surface: 'altertable', colorScheme: 'dark' });
  for (const value of [
    null,
    [],
    { surface: 'altertable', colorScheme: 'system' },
    { surface: 'unknown', colorScheme: 'light' },
  ])
    expect(parseHostContext(value)).toBeUndefined();
});

test('parent theme overrides saved preferences without persisting or allowing local changes', () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const writes: string[] = [];
  const style = { colorScheme: '', setProperty() {} };
  globalThis.window = {
    localStorage: {
      getItem() {
        return 'light';
      },
      setItem(_key: string, value: string) {
        writes.push(value);
      },
    },
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      };
    },
  } as unknown as Window & typeof globalThis;
  globalThis.document = { documentElement: { style } } as unknown as Document;
  try {
    const theme = createThemeController({ mode: 'system' }, 'dark');
    expect(theme.getMode()).toBe('dark');
    expect(style.colorScheme).toBe('dark');
    theme.setMode('light');
    expect(style.colorScheme).toBe('dark');
    theme.setHostMode('light');
    expect(style.colorScheme).toBe('light');
    theme.setHostMode('dark');
    theme.setHostMode(undefined);
    expect(theme.getMode()).toBe('light');
    expect(style.colorScheme).toBe('light');
    expect(writes).toEqual([]);
    theme.setMode('dark');
    expect(writes).toEqual(['dark']);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});
