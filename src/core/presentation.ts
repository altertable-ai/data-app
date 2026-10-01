import type { Theme } from '@/src/core/appearance';

/** Presentation owned by the parent shell, delivered only over a trusted bridge. */
export type DataAppPresentation = {
  surface: 'embedded' | 'standalone';
  theme: Theme;
};

export function isDataAppPresentation(
  value: unknown
): value is DataAppPresentation {
  if (!value || typeof value !== 'object') return false;
  const presentation = value as DataAppPresentation;

  return (
    (presentation.surface === 'embedded' ||
      presentation.surface === 'standalone') &&
    (presentation.theme === 'light' || presentation.theme === 'dark')
  );
}
