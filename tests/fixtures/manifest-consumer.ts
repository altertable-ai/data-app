import assert from 'node:assert/strict';
import fs from 'node:fs';
import { extractDataAppManifest } from '@altertable/data-app-manifest';

const importLine = "import { defineDataApp } from '@altertable/data-app';";
const declaration = `${importLine}\nconst app = defineDataApp({});`;

/** Shared by public API tests and isolated archive consumers under Node and Bun. */
export function verifyManifestConsumer() {
  const touched: string[] = [];
  const originals = {
    readFileSync: fs.readFileSync,
    existsSync: fs.existsSync,
    statSync: fs.statSync,
    realpathSync: fs.realpathSync,
    writeFileSync: fs.writeFileSync,
  };
  try {
    for (const key of Object.keys(originals) as (keyof typeof originals)[]) {
      // Fail closed: even attempted access is observable if the compiler catches it.
      Object.defineProperty(fs, key, {
        configurable: true,
        writable: true,
        value: (...args: unknown[]) => {
          touched.push(String(args[0]));
          throw new Error('Extraction must not access the filesystem');
        },
      });
    }
    const inert = `/// <reference path="/manifest-must-not-read.ts" />
/// <reference types="manifest-must-not-resolve" />
${declaration}
import '/manifest-must-not-read.ts';
import { missing } from 'manifest-must-not-resolve';
(globalThis as any).__manifestExecuted = true;
throw new Error('Must not execute');
//# sourceMappingURL=file:///manifest-must-not-read.map`;
    assert.deepEqual(extractDataAppManifest(inert), {
      manifest: {},
      diagnostics: [],
    });
    assert.equal(
      extractDataAppManifest(
        declaration.replace(
          '{}',
          '{ x: (() => { (globalThis as any).__manifestExecuted = true; })() }'
        )
      ).manifest,
      null
    );
    assert.equal(Object.hasOwn(globalThis, '__manifestExecuted'), false);
    assert.deepEqual(touched, []);
  } finally {
    for (const key of Object.keys(originals) as (keyof typeof originals)[])
      Object.defineProperty(fs, key, {
        configurable: true,
        writable: true,
        value: originals[key],
      });
  }
  for (const statement of [
    'const app = defineDataApp({});',
    'let app = defineDataApp({});',
    'let app = defineDataApp({}); app = {};',
    'var app = defineDataApp({});',
    'export let app = defineDataApp({});',
    'export default defineDataApp({});',
    'defineDataApp({});',
    'const before = 1, app = defineDataApp({}), after = 2;',
    'const app = ((defineDataApp(({} as const) satisfies unknown))) as unknown;',
    'export default (defineDataApp({}) satisfies unknown);',
    '(defineDataApp({}) as unknown);',
  ])
    assert.deepEqual(
      extractDataAppManifest(`${importLine}\n${statement}`),
      { manifest: {}, diagnostics: [] },
      statement
    );

  const wrapped = extractDataAppManifest(`${importLine}
    const app = defineDataApp(({
      queries: ({ q: { statement: ('SELECT $p' as const), params: { p: ({ defaultValue: ((-0) satisfies number) }) } } } satisfies unknown),
      values: ([('cooked' as string), (true), (null satisfies unknown), -(0 as number), +(0x10 satisfies number)] as const),
    } as const) satisfies unknown);
  `);
  assert.deepEqual(wrapped, {
    manifest: {
      queries: {
        q: { statement: 'SELECT $p', params: { p: { defaultValue: -0 } } },
      },
      values: ['cooked', true, null, -0, 16],
    },
    diagnostics: [],
  });

  for (const statement of [
    'function create() { return defineDataApp({}); }',
    'if (true) defineDataApp({});',
    'const app = true ? defineDataApp({}) : {};',
    'const app = true && defineDataApp({});',
    'const app = wrap(defineDataApp({}));',
    'const app = [defineDataApp({})];',
    'using app = defineDataApp({});',
  ])
    assert.equal(
      extractDataAppManifest(`${importLine}\n${statement}`).manifest,
      null,
      statement
    );

  for (const value of [
    '(execute() as unknown)',
    '(variable satisfies unknown)',
    '({ ...other } as const)',
    '([,] as const)',
    '({ x: 1, x: 2 } satisfies unknown)',
    '({ __proto__: {} } as const)',
  ]) {
    const result = extractDataAppManifest(
      `${importLine} const app = defineDataApp({ nested: ${value} });`
    );
    assert.equal(result.manifest, null, value);
    assert(
      result.diagnostics.some(diagnostic => diagnostic.code === 'literal'),
      value
    );
  }
  const wrappedError = `${importLine} const app = defineDataApp({ nested: (execute() as unknown) });`;
  const wrappedIssue = extractDataAppManifest(wrappedError).diagnostics[0]!;
  assert.deepEqual(wrappedIssue.path, ['nested']);
  assert.equal(
    wrappedError.slice(wrappedIssue.start.offset, wrappedIssue.end.offset),
    'execute()'
  );
  const unrelatedBindings = [
    'type defineDataApp = unknown; interface app {}',
    'namespace defineDataApp { export type T = unknown; }',
    'declare namespace defineDataApp { export type T = unknown; }',
    "import type { defineDataApp, app } from 'types';",
    "import type defineDataApp = require('types');",
    'function shadow(defineDataApp: unknown) { defineDataApp({}); }',
    'function shadow() { defineDataApp({}); let defineDataApp; }',
    'function shadow() { defineDataApp({}); function defineDataApp() {} }',
    'function shadow() { defineDataApp({}); var defineDataApp; }',
    'function shadow() { declare function defineDataApp(): void; defineDataApp({}); }',
    "namespace N { import defineDataApp = require('never-load'); defineDataApp({}); }",
    'function shadow({ defineDataApp }: unknown) { defineDataApp({}); }',
    'function shadow() { const { defineDataApp } = {}; defineDataApp({}); }',
    'class C { constructor(public defineDataApp: unknown) { defineDataApp({}); } }',
    'enum E { defineDataApp = 1, value = defineDataApp({}) }',
    'namespace N { export function defineDataApp() {} } namespace N { defineDataApp({}); }',
    'namespace N { defineDataApp({}); } namespace N { export function defineDataApp() {} }',
    'namespace N { export const defineDataApp = 1; } namespace N { defineDataApp({}); }',
    'namespace N { export namespace Nested { export function defineDataApp() {} } } namespace N.Nested { defineDataApp({}); }',
    'namespace N.Nested { defineDataApp({}); } namespace N { export namespace Nested { export function defineDataApp() {} } }',
    'namespace N { export namespace Nested { export function defineDataApp() {} } } namespace N { export namespace Nested { defineDataApp({}); } }',
    'namespace N { type defineDataApp = unknown; const unrelated = 1; }',
    'const helpers = { defineDataApp() {} }; helpers.defineDataApp({});',
    'const view = <div>{"defineDataApp({})"}</div>; const identity = <T,>(x: T) => x;',
  ];
  for (const extra of unrelatedBindings)
    assert.deepEqual(
      extractDataAppManifest(`${declaration}\n${extra}`),
      {
        manifest: {},
        diagnostics: [],
      },
      extra
    );

  // Type-only declarations must not hide the imported value.
  for (const extra of [
    'type defineDataApp = unknown; defineDataApp({});',
    'interface defineDataApp {} defineDataApp({});',
    'namespace N { type defineDataApp = unknown; defineDataApp({}); }',
    'namespace N { interface defineDataApp {} defineDataApp({}); }',
    'function f() { defineDataApp({}); }',
    'const app = {};',
    'declare const app: unknown;',
    'const defineDataApp = () => ({});',
    'declare function defineDataApp(): void;',
    'namespace defineDataApp { export const value = 1; }',
    'const { app } = {};',
    'const [app] = [];',
  ])
    assert.equal(
      extractDataAppManifest(`${declaration}\n${extra}`).manifest,
      null,
      extra
    );

  const literal = extractDataAppManifest(
    declaration.replace(
      '{}',
      `{
    queries: { q: { statement: '\\t SELECT $p; \\r\\n', params: { required: {}, p: { defaultValue: -0 } } } },
    unknown: [null, true, false, +0x10, -0b11, 1_000, -0o10, 1e2, \`cooked \\u0041\`],
    title: 123, scope: []
  }`
    )
  );
  assert.deepEqual(literal, {
    manifest: {
      queries: {
        q: {
          statement: '\t SELECT $p; \r\n',
          params: { required: {}, p: { defaultValue: -0 } },
        },
      },
      unknown: [null, true, false, 16, -3, 1000, -8, 100, 'cooked A'],
      title: 123,
      scope: [],
    },
    diagnostics: [],
  });

  for (const expression of [
    '...x',
    '["computed"]: 1',
    'shorthand',
    'method() {}',
    'get x() { return 1 }',
    'x: [ , ]',
    'x: [...values]',
    'x: 1n',
    'x: 1e999',
    'x: -1e999',
    'x: undefined',
    'x: NaN',
    'x: Infinity',
    'x: `a${1}`',
    'x: doWork()',
    'x: () => 1',
    'x: /regex/',
    '__proto__: {}',
    '1: true, 0x1: false',
    "'a': 1, '\\u0061': 2",
  ]) {
    const result = extractDataAppManifest(
      declaration.replace('{}', `{${expression}}`)
    );
    assert.equal(result.manifest, null, expression);
    assert(
      result.diagnostics.some(diagnostic => diagnostic.code === 'literal'),
      expression
    );
  }
  for (const call of [
    '(defineDataApp)({})',
    'defineDataApp!({})',
    'defineDataApp?.({})',
  ])
    assert.equal(
      extractDataAppManifest(declaration.replace('defineDataApp({})', call))
        .manifest,
      null,
      call
    );

  const unicode = declaration.replace(
    '{}',
    '{ text: "😀",\r\n bad: execute() }'
  );
  const diagnostic = extractDataAppManifest(unicode).diagnostics[0]!;
  const offset = unicode.indexOf('execute()');
  assert.deepEqual(diagnostic, {
    code: 'literal',
    message:
      'Use only literal objects, arrays, strings, finite signed numbers, booleans, and null.',
    start: { offset, line: 3, column: 7 },
    end: { offset: offset + 9, line: 3, column: 16 },
    path: ['bad'],
  });
  const sameLine = declaration.replace('{}', '{ text: "😀", bad: execute() }');
  const issue = extractDataAppManifest(sameLine).diagnostics[0]!;
  assert.equal(
    issue.start.column,
    sameLine.indexOf('execute()') - sameLine.indexOf('\n')
  );
  assert.equal(issue.end.offset - issue.start.offset, 9);
  for (const malformed of [
    'const broken = ;',
    'const view = <div>;',
    'const f = <T>(x: T) => x;',
  ]) {
    const result = extractDataAppManifest(`${declaration}\n${malformed}`);
    assert.equal(result.manifest, null);
    assert(result.diagnostics.some(diagnostic => diagnostic.code === 'syntax'));
  }
}
