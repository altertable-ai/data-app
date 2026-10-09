import type { AppearanceOptions } from '@altertable/data-app/appearance';
import { defineDataApp } from '@altertable/data-app';
import type { TableWidgetProps } from '@altertable/data-app/react/ui';

// Compile-only assertions; the hosted endpoint can enforce these through TypeScript.
const dataApp = defineDataApp({
  title: 'Example',
  description: 'Explore example metrics and appearance.',
  scope: { organization: 'demo', environment: 'test' },
  appearance: { theme: 'system', typography: { heading: 'Georgia' } },
  queries: {},
});

void dataApp;

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
