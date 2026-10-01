import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateApp } from '@altertable/data-app/validate';
import {
  normalizeAppearance,
  parseAppearance,
} from '@altertable/data-app/appearance';

test('appearance defaults merge typed overrides and ignore unrelated parsed fields', () => {
  const settings = normalizeAppearance({ typography: { heading: 'Georgia' } });
  expect(settings.typography).toEqual({ body: 'system', heading: 'Georgia' });
  settings.chartColors.length = 0;
  expect(normalizeAppearance().chartColors.length).toBeGreaterThan(0);
  expect(
    parseAppearance({
      theme: 'dark',
      future: true,
      typography: { future: true },
    }).theme
  ).toBe('dark');
  expect(() => parseAppearance(null)).toThrow('Invalid appearance');
  expect(() => parseAppearance({ theme: 'invalid' })).toThrow(
    'Invalid appearance'
  );
});

test('app validation rejects authoring errors before bundling without executing app code', async () => {
  const directory = await mkdtemp(
    join(process.cwd(), '.package-check-validation-')
  );
  try {
    const valid = join(directory, 'valid.ts');
    await writeFile(
      valid,
      `
import type { DataAppConfig } from '@altertable/data-app/config';
const config = {
  title: 'Example', scope: { organization: 'demo', environment: 'test' },
  appearance: { theme: 'system', typography: { heading: 'Georgia' } },
} satisfies DataAppConfig;
throw new Error('The validator must not execute app code.');
export default config;
`
    );
    expect(await validateApp({ entrypoints: [valid] })).toEqual({
      success: true,
      diagnostics: [],
    });
    const invalid = join(directory, 'invalid.ts');
    await writeFile(
      invalid,
      `
import type { DataAppConfig } from '@altertable/data-app/config';
import type { TableWidgetProps, DateRangeVariableOptions } from '@altertable/data-app/react';
import type { DimensionFilterOptions } from '@altertable/data-app/contract';
const config: DataAppConfig = { title: 'Example', scope: { organization: 'demo', environment: 'test' }, appearance: { theme: 'invalid' } };
const typo: DataAppConfig = { ...config, appearance: { densitty: 'compact' } };
const table: TableWidgetProps<{}> = { title: 'Table', rows: [], columns: [{ id: 'id', header: 'ID', cell: () => null }], rowKey: () => 'id', empty: { title: 'Empty' }, limit: 1, pagination: false };
const dimension: DimensionFilterOptions<string> = { key: 'group', label: 'Group', valueType: 'string', selection: 'single', options: [], facet: { operation: 'facet', input: () => ({}) } };
const defaultValue: DateRangeVariableOptions['defaultValue'] = { kind: 'preset', id: 'last-7', comparison: 'previous' };
`
    );
    const result = await validateApp({ entrypoints: [invalid] });
    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(5);
    for (const diagnostic of result.diagnostics) {
      expect(diagnostic.file).toBe(invalid);
      expect(diagnostic.line).toBeGreaterThan(0);
      expect(diagnostic.column).toBeGreaterThan(0);
      expect(diagnostic.code).toMatch(/^TS\d+$/);
    }
    const environmentProject = join(directory, 'environment.tsconfig.json');
    await writeFile(
      environmentProject,
      JSON.stringify({ compilerOptions: { types: ['bun'] } })
    );
    expect(
      (
        await validateApp({
          entrypoints: [valid],
          tsconfig: environmentProject,
        })
      ).success
    ).toBe(true);
    // Even a project opting out of checking cannot weaken the build gate.
    const project = join(directory, 'tsconfig.json');
    await writeFile(
      project,
      JSON.stringify({ compilerOptions: { noCheck: true, strict: false } })
    );
    expect(
      (await validateApp({ entrypoints: [invalid], tsconfig: project })).success
    ).toBe(false);
    expect(
      (await validateApp({ entrypoints: [join(directory, 'missing.ts')] }))
        .success
    ).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
