import { upgradeDataApp } from '@altertable/data-app-upgrade';
import { describe, expect, it } from 'vitest';

describe('SDK upgrades', () => {
  it('updates a historical React starter import across skipped releases', () => {
    const source = `import { DataSection, searchVariable, choiceVariable as choice } from '@altertable/data-app-react';
const search = searchVariable({ key: 'group', label: 'Group', defaultValue: '' });
`;
    const result = upgradeDataApp({
      source,
      fromVersion: '0.75.0',
      toVersion: '0.78.0',
    });
    expect(result.source)
      .toBe(`import { DataSection } from '@altertable/data-app-react';
import { searchFilter as searchVariable, choiceFilter as choice } from '@altertable/data-app/contract';
const search = searchVariable({ key: 'group', label: 'Group', defaultValue: '' });
`);
    expect(result.migrationGuides).toEqual(['0.76.0', '0.77.0', '0.78.0']);
    expect(
      result.steps.map(({ id, version, status }) => [version, id, status])
    ).toEqual([
      ['0.76.0', 'calendar-date-ranges', 'unchanged'],
      ['0.77.0', 'move-filter-imports', 'applied'],
      ['0.77.0', 'operation-filters-and-views', 'review_required'],
      ['0.78.0', 'registered-query-client', 'unchanged'],
      ['0.78.0', 'embedded-page-actions', 'unchanged'],
    ]);

    const repeated = upgradeDataApp({
      source: result.source,
      fromVersion: '0.75.0',
      toVersion: '0.78.0',
    });
    expect(repeated.source).toBe(result.source);
    expect(
      repeated.steps.find(step => step.id === 'move-filter-imports')?.status
    ).toBe('unchanged');
  });

  it('reports calendar SQL for review without applying a later codemod', () => {
    const source = `import { dateRangeVariable, searchVariable } from '@altertable/data-app-react';`;
    const result = upgradeDataApp({
      source,
      fromVersion: '0.75.0',
      toVersion: '0.76.0',
    });
    expect(result.source).toBe(source);
    expect(result.migrationGuides).toEqual(['0.76.0']);
    expect(result.steps).toEqual([
      {
        id: 'calendar-date-ranges',
        version: '0.76.0',
        status: 'review_required',
        message: expect.stringContaining('SQL predicates'),
      },
    ]);
  });

  it('keeps other imports, comments, and code outside the migration', () => {
    const source = `// Explain the filters.
import { searchVariable, /* Keep this note. */ parseCount } from '@altertable/data-app/contract';
import { searchVariable as unrelated } from './other.ts';
`;
    const result = upgradeDataApp({
      source,
      fromVersion: '0.76.0',
      toVersion: '0.77.0',
    });
    expect(result.source).toBe(`// Explain the filters.
import { searchFilter as searchVariable, /* Keep this note. */ parseCount } from '@altertable/data-app/contract';
import { searchVariable as unrelated } from './other.ts';
`);
  });

  it('rejects unsupported version ranges', () => {
    expect(() => upgradeDataApp({ source: '', fromVersion: '0.74.0' })).toThrow(
      RangeError
    );
    expect(() =>
      upgradeDataApp({ source: '', fromVersion: '0.78.0', toVersion: '0.77.0' })
    ).toThrow(RangeError);
    expect(() =>
      upgradeDataApp({
        source: '',
        fromVersion: '0.78.0',
        toVersion: '999.0.0',
      })
    ).toThrow(RangeError);
  });
});
