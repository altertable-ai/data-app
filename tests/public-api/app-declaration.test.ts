import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateAppDeclaration } from '@/scripts/validate-app-declaration';

function declaration(value: string) {
  return `import { defineDataApp as define } from '@altertable/data-app'; export const app = define(${value});`;
}

test('declaration extraction accepts literal data, aliased imports, signed numbers, and static SQL', () => {
  expect(
    validateAppDeclaration(
      declaration(
        '{title:"Orders", queries:{orders:{statement:`SELECT $amount`,params:{amount:{defaultValue:-10}}}}, flags:[true,false,null,+2]}'
      ),
      'app.ts'
    )
  ).toEqual([]);
});

for (const expression of [
  'config',
  '{...config}',
  '{title}',
  '{[key]:"Orders"}',
  '{get title(){return "Orders"}}',
  '{title: label}',
  '{title: getTitle()}',
  '{title: () => "Orders"}',
  '{queries:{orders:{statement:`SELECT ${amount}`}}}',
  '{items:[...values]}',
  '{items:[,1]}',
  '{amount: 1/0}',
  '{amount: 1e999}',
  '{amount: 1n}',
  '{value:/pattern/}',
  '{title:"Orders"} as const',
  '{title:"Orders"} satisfies Config',
]) {
  test(`declaration extraction rejects executable or nonliteral syntax: ${expression}`, () => {
    const diagnostics = validateAppDeclaration(
      declaration(expression),
      'app.ts'
    );
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]).toMatch(/^app.ts:\d+:\d+:/);
  });
}

test('declaration extraction requires one direct module-level const initializer', () => {
  const imported =
    "import {defineDataApp as define} from '@altertable/data-app';";
  for (const code of [
    'const app = define({}); const other = define({});',
    'function create(){const app=define({})}',
    'let app=define({});',
    'export default define({});',
    'const app=wrap(define({}));',
    'const app=define({}) as App;',
    'const app=define?.({});',
    'const app=define({},{});',
    '',
  ]) {
    expect(
      validateAppDeclaration(imported + code, 'app.ts').length
    ).toBeGreaterThan(0);
  }
  expect(
    validateAppDeclaration(
      'function defineDataApp(){}; defineDataApp({title:getTitle()})',
      'other.ts'
    )
  ).toHaveLength(1);
});

test('hosted starter stays extractable without evaluating its module', async () => {
  const source = await readFile('examples/starter-data-app/index.tsx', 'utf8');
  expect(validateAppDeclaration(source, 'index.tsx')).toEqual([]);
});
