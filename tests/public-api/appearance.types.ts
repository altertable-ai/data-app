import { defineDataApp } from '@altertable/data-app';
import type { AppearanceOptions } from '@altertable/data-app/appearance';

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
