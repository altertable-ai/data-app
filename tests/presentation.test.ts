import { expect, test } from 'bun:test';
import {
  applyAppearance,
  createThemeController,
  parseAppearance,
} from '@/src/core/appearance';
import { parsePresentation } from '@/src/core/presentation';

test('presentation accepts only known mounts and resolved themes', () => {
  expect(parsePresentation({ mount: 'altertable', theme: 'dark' })).toEqual({
    mount: 'altertable',
    theme: 'dark',
  });
  for (const value of [
    null,
    [],
    { mount: 'altertable', theme: 'system' },
    { mount: 'unknown', theme: 'light' },
  ])
    expect(parsePresentation(value)).toBeUndefined();
});

test('host appearance does not persist and standalone viewers restore their saved theme', () => {
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
    const appearance = parseAppearance({ mode: 'system' });
    const stopHostAppearance = applyAppearance({ ...appearance, mode: 'dark' });
    expect(style.colorScheme).toBe('dark');
    expect(writes).toEqual([]);
    stopHostAppearance();
    expect(() => createThemeController('unknown' as never)).toThrow(
      'Invalid theme preference.'
    );
    const viewerTheme = createThemeController(appearance.mode);
    expect(style.colorScheme).toBe('dark');
    expect(viewerTheme.getTheme()).toBe('light');
    const stopViewerAppearance = applyAppearance({
      ...appearance,
      mode: viewerTheme.getTheme(),
    });
    expect(style.colorScheme).toBe('light');
    let notifications = 0;
    const unsubscribe = viewerTheme.subscribe(() => notifications++);
    viewerTheme.setTheme('dark');
    viewerTheme.setTheme('dark');
    expect(notifications).toBe(1);
    unsubscribe();
    expect(writes).toEqual(['dark']);
    stopViewerAppearance();
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});
