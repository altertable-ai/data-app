import type { AppearanceOptions } from '@altertable/data-app/appearance';
import type { DataAppConfig } from '@altertable/data-app/config';
import type { TableWidgetProps } from '@altertable/data-app/react/ui';

// Compile-only assertions; the hosted endpoint can enforce these through TypeScript.
export const configuration = {
  title: 'Example',
  scope: { organization: 'demo', environment: 'test' },
  appearance: { theme: 'system', typography: { heading: 'Georgia' } },
} satisfies DataAppConfig;

export const invalidTheme: AppearanceOptions = {
  // @ts-expect-error Themes use the supported preferences.
  theme: 'invalid',
};
export const misspelledSetting: AppearanceOptions = {
  // @ts-expect-error Unknown authored appearance fields are rejected.
  densitty: 'compact',
};

const table = {
  title: 'Example',
  rows: [],
  columns: [{ id: 'id', header: 'ID', cell: () => null }] as const,
  rowKey: () => 'id',
  emptyFallback: { title: 'Empty' },
};
export const conflictingTable: TableWidgetProps<{}> = {
  ...table,
  limit: 1,
  // @ts-expect-error Preview limits and pagination cannot coexist.
  pagination: false,
};
