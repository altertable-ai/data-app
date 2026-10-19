import { readFile } from 'node:fs/promises';

import {
  extractDataAppManifest,
  type DataAppLiteralValue,
  type DataAppManifest,
} from '@altertable/data-app-manifest';
import { describe, expect, expectTypeOf, test } from 'vitest';

const fields = `title: 'Sales', description: 'Explore sales', scope: { organization: 'demo', environment: 'test' }, queries: {}`;
function argumentWith(field: string) {
  const key = /^([a-zA-Z]+):/.exec(field)?.[1];
  const parts = [
    "title: 'Sales'",
    "description: 'Explore sales'",
    "scope: { organization: 'demo', environment: 'test' }",
    'queries: {}',
  ];
  return `{ ${parts.filter(part => !key || !part.startsWith(key + ':')).join(', ')}, ${field} }`;
}
function source(argument = `{ ${fields} }`, binding = 'defineDataApp') {
  return `import { defineDataApp${binding === 'defineDataApp' ? '' : ` as ${binding}`} } from '@altertable/data-app';\nexport const app = ${binding}(${argument});`;
}

function rejected(text: string, code: string) {
  const result = extractDataAppManifest(text);
  expect(result.manifest).toBeNull();
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ code })])
  );
  for (const diagnostic of result.diagnostics) {
    expect(diagnostic.start.offset).toBeGreaterThanOrEqual(0);
    expect(diagnostic.end.offset).toBeLessThanOrEqual(text.length);
    expect(diagnostic.start.line).toBeGreaterThan(0);
    expect(diagnostic.start.column).toBeGreaterThan(0);
  }
  return result;
}

describe('static data app manifest', () => {
  test('exposes literal data and a result narrowed by manifest presence', () => {
    const result = extractDataAppManifest(source());
    expect(result.manifest).not.toBeNull();
    if (result.manifest) {
      expectTypeOf(result.manifest).toEqualTypeOf<DataAppManifest>();
      expectTypeOf(result.manifest.title).toEqualTypeOf<
        DataAppLiteralValue | undefined
      >();
      expectTypeOf(result.diagnostics).toEqualTypeOf<[]>();
    }
    expectTypeOf<undefined>().not.toExtend<DataAppLiteralValue>();
    expectTypeOf<() => string>().not.toExtend<DataAppLiteralValue>();
  });

  test('extracts a real TSX declaration with an import alias and unrelated code', () => {
    const result = extractDataAppManifest(`${source(undefined, 'declareApp')}
import { missing } from 'this-module-must-not-be-loaded';
const Component = () => <div title="defineDataApp({})">Sales</div>;
const expression = /defineDataApp[(){}]/;
const helpers = { defineDataApp() { throw Error('unrelated'); } };
helpers.defineDataApp();
function other(defineDataApp: (value: unknown) => unknown) { return defineDataApp({}); }
function shadow(declareApp: (value: unknown) => unknown) { return declareApp({}); }
`);
    expect(result.diagnostics).toEqual([]);
    expect(result.manifest).toEqual({
      title: 'Sales',
      description: 'Explore sales',
      scope: { organization: 'demo', environment: 'test' },
      queries: {},
    });
  });

  test('accepts arbitrary names, optional exports, sibling declarators, and separate type names', () => {
    for (const text of [
      source().replace('export const app', 'const declared'),
      source().replace(');', '), other = 1;'),
      source().replace('const app =', 'const other = 1, app ='),
      source() + '\ntype app = unknown; interface AnotherType {}',
      source() + "\nimport type { app } from 'types';",
    ])
      expect(extractDataAppManifest(text).diagnostics).toEqual([]);
  });

  test('uses the backend TSX grammar for generic arrow functions', () => {
    expect(
      extractDataAppManifest(
        source() + '\nconst identity = <T,>(value: T) => value;'
      ).diagnostics
    ).toEqual([]);
    rejected(source() + '\nconst identity = <T>(value: T) => value;', 'syntax');
  });

  test('accepts independent import aliases and type arguments, but rejects duplicate bindings', () => {
    const text = source()
      .replace(
        'import { defineDataApp }',
        'import { defineDataApp, defineDataApp as unused }'
      )
      .replace('= defineDataApp(', '= defineDataApp<{}>(');
    expect(extractDataAppManifest(text).diagnostics).toEqual([]);
    rejected(
      source() +
        "\nimport { defineDataApp, type DataAppConfig } from '@altertable/data-app';",
      'declaration'
    );
  });

  test('preserves cooked strings, SQL whitespace, required params and scalar defaults', () => {
    const statement =
      '  SELECT "\\path", \'quoted\'\nWHERE amount >= $amount;  ';
    const result = extractDataAppManifest(
      source(`{
      title: "Escaped \\u0053ales", description: \`Line one\nLine two \\n\`,
      scope: { organization: 'demo', environment: 'test' },
      queries: { sales: { statement: ${JSON.stringify(statement)}, params: {
        required: {}, amount: { defaultValue: -1.2e3 }, positive: { defaultValue: +0x10 },
        separated: { defaultValue: 1_000 }, binary: { defaultValue: 0b11 }, octal: { defaultValue: -0o10 },
        zero: { defaultValue: -0 }, yes: { defaultValue: true }, no: { defaultValue: false },
        nothing: { defaultValue: null }, text: { defaultValue: ${'`escaped \\` \\u0041`'} }
      } } },
      appearance: { chartColors: ['red', 'blue'], typography: { body: 'system' } },
      dateFormatting: { locale: 'en-US', timeZone: 'UTC' }
    }`)
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.manifest?.title).toBe('Escaped Sales');
    expect(result.manifest?.description).toBe('Line one\nLine two \n');
    expect(result.manifest?.queries).toEqual({
      sales: {
        statement,
        params: {
          required: {},
          amount: { defaultValue: -1200 },
          positive: { defaultValue: 16 },
          separated: { defaultValue: 1000 },
          binary: { defaultValue: 3 },
          octal: { defaultValue: -8 },
          zero: { defaultValue: -0 },
          yes: { defaultValue: true },
          no: { defaultValue: false },
          nothing: { defaultValue: null },
          text: { defaultValue: 'escaped ` A' },
        },
      },
    });
  });

  test('does not execute source, imports, or callbacks', () => {
    const key = '__manifest_executed__';
    const text = `${source()}
import 'node:child_process';
(globalThis as any).${key} = true;
throw new Error('this must never execute');`;
    expect(extractDataAppManifest(text).diagnostics).toEqual([]);
    rejected(
      source(
        argumentWith(
          `description: (() => { (globalThis as any).${key} = true; return 'side effect'; })()`
        )
      ),
      'literal'
    );
    expect(Object.hasOwn(globalThis, key)).toBe(false);
  });

  test.each([
    `const app = defineDataApp({ ${fields} });`,
    source().replace("'@altertable/data-app'", "'unrelated'"),
    source().replace('import {', 'import type {'),
    source().replace('import { defineDataApp', 'import { type defineDataApp'),
    `import * as pkg from '@altertable/data-app'; const app = pkg.defineDataApp({ ${fields} });`,
    `function defineDataApp(value: unknown) { return value; } const app = defineDataApp({ ${fields} });`,
    source().replace('export const app', 'const [app]'),
    source().replace('export const app', 'function create() { const app') +
      ' }',
    source() + `\nconst another = defineDataApp({ ${fields} });`,
    source().replace('});', '}, {});'),
    source().replace('({', '(config, {'),
    source() + '\ndefineDataApp({});',
    source() + '\nfunction more() { defineDataApp({}); }',
    source() + '\nconst defineDataApp = () => ({});',
    source() + '\nconst app = {};',
    source() + '\nconst wrapped = (defineDataApp)({});',
    source().replace('= defineDataApp(', '= (defineDataApp)('),
    source().replace('= defineDataApp(', '= defineDataApp?.('),
  ])('rejects absent or ambiguous declarations: %s', text => {
    rejected(text, 'declaration');
  });

  test.each([
    '...extra',
    "['title']: 'dynamic'",
    'title',
    'title() {}',
    'get title() { return "a"; }',
    "title: 'one', title: 'two'",
    "title: 'one', 'title': 'two'",
    'description: variable',
    "description: String('a')",
    "description: () => 'a'",
    'description: `value ${1}`',
    'description: /regex/',
    'description: undefined',
    'description: NaN',
    'description: Infinity',
    'description: 1e999',
    'description: -1e999',
    'description: 1n',
    'description: tag`text`',
    'description: new String()',
    'description: [,...values]',
    'description: [ , ]',
    'description: obj.value',
    "scope: { organization: 'a', environment: 'b', ...other }",
    "queries: { q: { statement: 'select 1', params: { a: {}, a: {} } } }",
  ])('rejects prohibited expressions and duplicate keys: %s', field => {
    rejected(source(argumentWith(field)), 'literal');
  });

  test('extracts literal data without adding configuration schema validation', () => {
    for (const argument of [
      '{}',
      `{ ${fields}, extra: { values: [1, true, null] } }`,
      argumentWith('title: 0'),
      argumentWith('scope: []'),
      argumentWith("appearance: { theme: 'auto' }"),
      argumentWith(
        "queries: { q: { statement: '', params: { p: { defaultValue: [] } } } }"
      ),
    ]) {
      const result = extractDataAppManifest(source(argument));
      expect(result.manifest).not.toBeNull();
      expect(result.diagnostics).toEqual([]);
    }
    expect(extractDataAppManifest(source('{}')).manifest).toEqual({});
    expect(
      extractDataAppManifest(
        source(`{ ${fields}, extra: { values: [1, true, null] } }`)
      ).manifest?.extra
    ).toEqual({ values: [1, true, null] });
  });

  test('locates literal errors at authored expressions', () => {
    const text = source(argumentWith('description: getDescription()'));
    const result = rejected(text, 'literal');
    const issue = result.diagnostics[0]!;
    expect(text.slice(issue.start.offset, issue.end.offset)).toBe(
      'getDescription()'
    );
    expect(issue.path).toEqual(['description']);
    expect(issue.start.line).toBe(2);
    expect(issue.start.column).toBe(issue.start.offset - text.indexOf('\n'));
  });

  test('reports malformed source, including code outside the declaration', () => {
    rejected(
      source().replace("title: 'Sales'", "title: 'unterminated"),
      'syntax'
    );
    rejected(source() + '\nconst broken = <div>;', 'syntax');
    rejected(source() + '\nconst broken = ;', 'syntax');
  });

  test('rejects prototype setters instead of extracting data absent from the runtime object', () => {
    rejected(
      source(
        argumentWith(
          "queries: { '__proto__': { statement: 'SELECT 1', params: {} } }"
        )
      ),
      'literal'
    );
    rejected(
      source(
        argumentWith(
          "queries: { q: { statement: 'SELECT 1', params: { '__proto__': null } } }"
        )
      ),
      'literal'
    );
    const result = extractDataAppManifest(
      source(
        argumentWith(
          "queries: { constructor: { statement: 'SELECT 1', params: { constructor: {} } } }"
        )
      )
    );
    expect(result.diagnostics).toEqual([]);
    expect(
      Object.hasOwn(result.manifest!.queries as object, 'constructor')
    ).toBe(true);
  });
});

test('preserves the shared Node and Bun archive consumer contract', async () => {
  const { verifyManifestConsumer } =
    await import('@/tests/fixtures/manifest-consumer');
  verifyManifestConsumer();
});

test('extracts the documented hosted starter declaration', async () => {
  const text = await readFile(
    new URL(
      '../../packages/data-app-examples/templates/starter-data-app/index.tsx',
      import.meta.url
    ),
    'utf8'
  );
  const result = extractDataAppManifest(text);
  expect(result.diagnostics).toEqual([]);
  expect(result.manifest).toMatchObject({
    title: 'Sample counts',
    scope: { organization: 'demo', environment: 'sample' },
    queries: {
      sampleCountsByGroup: {
        projections: {
          group_name: { type: 'string' },
          sample_count: { type: 'number' },
        },
        params: {
          groupName: { type: 'string', defaultValue: '' },
          limit: { type: 'number', defaultValue: 10 },
        },
      },
    },
  });
});
