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
    expect(result).toEqual({
      source: `import { DataSection } from '@altertable/data-app-react';
import { searchFilter as searchVariable, choiceFilter as choice } from '@altertable/data-app/contract';
const search = searchVariable({ key: 'group', label: 'Group', defaultValue: '' });
`,
      appliedCodemods: ['0.77.0'],
      migrationGuides: ['0.76.0', '0.77.0', '0.78.0'],
    });
    expect(
      upgradeDataApp({
        source: result.source,
        fromVersion: '0.75.0',
        toVersion: '0.78.0',
      }).appliedCodemods
    ).toEqual([]);
  });

  it('keeps a guide-only release from rewriting imports before their removal', () => {
    const source =
      "import { searchVariable } from '@altertable/data-app-react';";
    expect(
      upgradeDataApp({ source, fromVersion: '0.75.0', toVersion: '0.76.0' })
    ).toEqual({
      source,
      appliedCodemods: [],
      migrationGuides: ['0.76.0'],
    });
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
