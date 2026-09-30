import { expect, test } from 'bun:test';
import { applyAppearance } from '@/src/core/appearance';

test('dark appearance installs canvas tokens without inline element colors', () => {
  const tokens = new Map<string, string>();
  const rootStyle = {
    colorScheme: '',
    backgroundColor: '',
    color: '',
    setProperty(name: string, value: string) {
      tokens.set(name, value);
    },
  };
  const body = { style: { backgroundColor: '', color: '' } };
  const appRoot = { style: { backgroundColor: '', color: '' } };
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = {
    documentElement: { style: rootStyle },
    body,
    getElementById(id: string) {
      return id === 'root' ? appRoot : null;
    },
  } as unknown as Document;
  globalThis.window = {
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      };
    },
  } as unknown as Window & typeof globalThis.window;
  try {
    const stop = applyAppearance({ mode: 'dark', baseColor: 'slate' });
    expect(rootStyle.colorScheme).toBe('dark');
    expect(tokens.get('--at-background')).toBe('#111820');
    expect(tokens.get('--at-text')).toBe('#f0f4f8');
    expect(rootStyle.backgroundColor).toBe('');
    expect(rootStyle.color).toBe('');
    expect(body.style.backgroundColor).toBe('');
    expect(appRoot.style.backgroundColor).toBe('');
    stop();
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test('ranking and page shell styles keep text and canvas on theme tokens', async () => {
  const ranking = await Bun.file(
    new URL('../src/react/ui/Ranking.css', import.meta.url)
  ).text();
  const layout = await Bun.file(
    new URL('../src/react/ui/AppLayout.css', import.meta.url)
  ).text();
  expect(ranking).toContain(
    '.altertable-ranking-reading > span {\n  min-width: 0;\n  overflow-wrap: anywhere;\n  color: var(--at-text, #202124);'
  );
  expect(ranking).toContain(
    '.altertable-ranking-reading strong {\n  flex: none;\n  color: var(--at-text, #202124);'
  );
  expect(layout).toContain(
    'html,\nbody,\n#root {\n  margin: 0;\n  color: var(--at-text, #202124);\n  background: var(--at-background, #fff);'
  );
  expect(layout).not.toContain('body,\n#root {\n  min-height: 100dvh;');
  expect(layout).toContain('.altertable-app-layout');
  expect(layout).toContain('min-height: 100dvh;');
});
