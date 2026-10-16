import assert from 'node:assert/strict';
import { Glob } from 'bun';
import {
  dataAppStyleClasses,
  dataAppStyleTokens,
} from '@/packages/data-app-react/src/style-contract.ts';
const files = await Array.fromAsync(
  new Glob('packages/data-app-react/src/**/*.css').scan('.')
);
const sources = await Promise.all(files.map(path => Bun.file(path).text()));
const tokenConsumers = await Promise.all(
  (
    await Array.fromAsync(
      new Glob('packages/data-app-react/src/**/*.{ts,tsx}').scan('.')
    )
  ).map(path => Bun.file(path).text())
);
const styles = [...sources, ...tokenConsumers].join('\n');
const definitions = new Set(
  sources.flatMap(source =>
    [...source.matchAll(/(--atbl-[\w-]+)\s*:/g)].map(match => match[1])
  )
);
for (const [index, source] of sources.entries()) {
  for (const match of source.matchAll(/var\(\s*(--atbl-[\w-]+)\s*(,)?/g))
    assert(
      match[1]!.startsWith('--atbl-input-') ||
        definitions.has(match[1]) ||
        match[2],
      `${files[index]}: unresolved token ${match[1]}`
    );
  if (files[index]!.startsWith('packages/data-app-react/src/ui/'))
    assert(
      !/box-shadow:[^;]*rgb\(/.test(source),
      `${files[index]}: hardcoded shadow color`
    );
}
for (const [name, hook] of Object.entries(dataAppStyleClasses)) {
  const source = await Bun.file(
    hook.kind === 'root'
      ? `packages/data-app-react/src/ui/${hook.component.split('.')[0]}.tsx`
      : 'packages/data-app-react/src/base.css'
  ).text();
  assert(
    new RegExp(String.raw`(?<![\w-])${name}(?![\w-])`).test(source),
    `Missing public style hook ${name}`
  );
}
for (const name of dataAppStyleTokens) {
  assert(!name.startsWith('--atbl-input-'), `Private token exposed: ${name}`);
  assert(
    new RegExp(`${name}\\s*:`).test(styles) ||
      new RegExp(`var\\(\\s*${name}\\s*[,)]`).test(styles),
    `Unused public token ${name}`
  );
}
const controls =
  /<(button|summary|AriaButton|ListBoxItem|DateSegment|CalendarCell|AriaTab|AriaTabPanel)\b([^>]*?)>/g;
for await (const path of new Glob(
  'packages/data-app-react/src/{ui,annotations}/*.tsx'
).scan('.')) {
  const source = await Bun.file(path).text();
  for (const [, tag, attributes] of source.matchAll(controls)) {
    assert(
      attributes?.includes('data-atbl-focus'),
      `${path}: ${tag} lacks a focus hook`
    );
    assert(
      tag === 'AriaTabPanel' || attributes?.includes('data-atbl-control'),
      `${path}: ${tag} lacks a cursor hook`
    );
  }
}
