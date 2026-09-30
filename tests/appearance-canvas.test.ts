import { expect, test } from 'bun:test';
import { applyAppearance } from '@/src/core/appearance';

test('dark appearance paints the page canvas from the palette', () => {
  const rootStyle = {
    colorScheme: '',
    backgroundColor: '',
    color: '',
    setProperty() {},
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
    expect(rootStyle.backgroundColor).toBe('#111820');
    expect(rootStyle.color).toBe('#f0f4f8');
    expect(body.style.backgroundColor).toBe('#111820');
    expect(body.style.color).toBe('#f0f4f8');
    expect(appRoot.style.backgroundColor).toBe('#111820');
    expect(appRoot.style.color).toBe('#f0f4f8');
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
});
