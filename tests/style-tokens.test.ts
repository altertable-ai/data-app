import { expect, test } from 'bun:test';
import { Glob } from 'bun';

// Catch incomplete migrations and new component tokens before an invalid var()
// silently discards a declaration in the browser.
test('every data app CSS token reference has a definition or native fallback', async () => {
  const files = await Array.fromAsync(new Glob('src/react/**/*.css').scan('.'));
  const sources = await Promise.all(files.map(file => Bun.file(file).text()));
  const definitions = new Set(
    sources.flatMap(source =>
      [...source.matchAll(/(--atbl-[\w-]+)\s*:/g)].map(match => match[1])
    )
  );
  const unresolved = sources.flatMap((source, index) =>
    [...source.matchAll(/var\(\s*(--atbl-[\w-]+)\s*(,)?/g)]
      .filter(
        match =>
          !match[1].startsWith('--atbl-input-') &&
          !definitions.has(match[1]) &&
          !match[2]
      )
      .map(match => `${files[index]}: ${match[1]}`)
  );
  expect(unresolved).toEqual([]);
});

test('component CSS uses semantic shadows', async () => {
  const files = await Array.fromAsync(new Glob('src/react/ui/*.css').scan('.'));
  for (const file of files) {
    const css = await Bun.file(file).text();
    expect(css, file).not.toMatch(/box-shadow:[^;]*rgb\(/);
  }
});
