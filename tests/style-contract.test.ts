import { expect, test } from 'bun:test';
import { Glob } from 'bun';
import { validateAuthoredStyles } from '@/src/react/style-validation';
import {
  dataAppStyleClasses,
  dataAppStyleTokens,
} from '@/src/react/style-contract';

test('authoring validation accepts public customization, utilities and app-owned names', () => {
  expect(
    validateAuthoredStyles(
      '.altertable-button { --atbl-control-height: 40px; } .app-note {color:var(--atbl-muted)}',
      'css'
    )
  ).toEqual([]);
  expect(
    validateAuthoredStyles(
      '<Button className="app-action"/><span className="altertable-sr-only">Details</span>',
      'markup'
    )
  ).toEqual([]);
  expect(
    validateAuthoredStyles(
      '<button data-atbl-focus="ring" data-atbl-control="action">Run</button>',
      'markup'
    )
  ).toEqual([]);
});

test('authoring validation recognizes public template families', () => {
  expect(
    validateAuthoredStyles('`var(--atbl-chart-${index + 1})`', 'markup')
  ).toEqual([]);
  expect(
    validateAuthoredStyles('`var(--atbl-input-${name})`', 'markup').length
  ).toBeGreaterThan(0);
  expect(
    validateAuthoredStyles('`var(--atbl-made-up-${name})`', 'markup').length
  ).toBeGreaterThan(0);
});

test('authoring validation rejects private, invented and copied package hooks', () => {
  for (const source of [
    '.app {color:var(--atbl-input-accent)}',
    '.app {color:var(--atbl-unknown)}',
    '.app {color:var(--atbl-accent-hover)}',
    '.altertable-button-icon {width:12px}',
    '.altertable-made-up {display:flex}',
    '.app {color:var(--at-accent)}',
    '.app {color:#112233}',
  ])
    expect(validateAuthoredStyles(source, 'css').length).toBeGreaterThan(0);
  for (const source of [
    '<button className="altertable-button"/>',
    '<button className={"altertable-button"}/>',
    '<button className={classNames("app-action", "altertable-button")}/>',
    '<button data-atbl-focus="always"/>',
    '<button data-atbl-focus={"always"}/>',
    '{"data-atbl-focus":"always"}',
    '<button data-atbl-typo="ring"/>',
    '<button data-atbl-internal-focus-state="focused"/>',
    '<div style={{color:"#112233"}}/>',
  ])
    expect(validateAuthoredStyles(source, 'markup').length).toBeGreaterThan(0);
});

test('new package native and Aria control owners declare interaction hooks', async () => {
  const controls =
    /<(button|summary|AriaButton|ListBoxItem|DateSegment|CalendarCell|AriaTab|AriaTabPanel)\b([^>]*?)>/g;
  const missing: string[] = [];
  for await (const path of new Glob('src/react/ui/*.tsx').scan('.')) {
    const source = await Bun.file(path).text();
    for (const [, tag, attributes] of source.matchAll(controls)) {
      if (!attributes?.includes('data-atbl-focus'))
        missing.push(`${path}: ${tag} lacks a focus hook`);
      if (tag !== 'AriaTabPanel' && !attributes?.includes('data-atbl-control'))
        missing.push(`${path}: ${tag} lacks a cursor hook`);
    }
  }
  expect(missing).toEqual([]);
});

test('stable class and public token registries match rendered component sources', async () => {
  for (const [name, hook] of Object.entries(dataAppStyleClasses)) {
    const source = await Bun.file(
      hook.kind === 'root'
        ? `src/react/ui/${hook.component}.tsx`
        : 'src/react/base.css'
    ).text();
    expect(source).toMatch(new RegExp(String.raw`(?<![\w-])${name}(?![\w-])`));
  }
  expect(
    dataAppStyleTokens.some(name => name.startsWith('--atbl-input-'))
  ).toBe(false);
});

// Public names must affect authored CSS, rather than only describe an inert hook.
test('public tokens have an authored CSS definition or consumer', async () => {
  const styles = (
    await Promise.all(
      (await Array.fromAsync(new Glob('src/react/**/*.css').scan('.'))).map(
        path => Bun.file(path).text()
      )
    )
  ).join('\n');
  for (const name of dataAppStyleTokens) {
    const definition = new RegExp(`${name}\\s*:`);
    const consumer = new RegExp(`var\\(\\s*${name}\\s*[,)]`);
    expect(definition.test(styles) || consumer.test(styles), name).toBe(true);
  }
});
