import { expect, test } from 'bun:test';
import { Glob } from 'bun';
import { dataAppStyleTokens } from '@/src/react/style-contract';

// Catch incomplete migrations and new component tokens before an invalid var()
// silently discards a declaration in the browser.
test('every public data app CSS token reference has a definition', async () => {
  const files = await Array.fromAsync(new Glob('src/react/**/*.css').scan('.'));
  const sources = await Promise.all(files.map(file => Bun.file(file).text()));
  const definitions = new Set(
    sources.flatMap(source =>
      [...source.matchAll(/(--atbl-[\w-]+)\s*:/g)].map(match => match[1])
    )
  );
  for (const [name, token] of Object.entries(dataAppStyleTokens)) {
    if (token.scope === 'component') definitions.add(name);
  }
  const unresolved = sources.flatMap((source, index) =>
    [...source.matchAll(/var\((--atbl-[\w-]+)/g)]
      .filter(
        match =>
          !match[1].startsWith('--atbl-input-') && !definitions.has(match[1])
      )
      .map(match => `${files[index]}: ${match[1]}`)
  );
  expect(unresolved).toEqual([]);
});

test('component CSS consumes canonical defaults without alternate token fallbacks', async () => {
  const files = await Array.fromAsync(new Glob('src/react/ui/*.css').scan('.'));
  for (const file of files) {
    const css = await Bun.file(file).text();
    expect(css, file).not.toMatch(/var\(--atbl-[\w-]+\s*,/);
    expect(css, file).not.toMatch(/box-shadow:[^;]*rgb\(/);
  }
});
