import type { Theme } from '@/src/core/appearance';

/** Presentation owned by the parent shell, delivered only over a trusted bridge. */
export type DataAppPresentation = {
  surface: 'altertable' | 'custom';
  theme: Theme;
};

export function isDataAppPresentation(
  value: unknown
): value is DataAppPresentation {
  if (!value || typeof value !== 'object') return false;
  const presentation = value as DataAppPresentation;

  return (
    (presentation.surface === 'altertable' ||
      presentation.surface === 'custom') &&
    (presentation.theme === 'light' || presentation.theme === 'dark')
  );
}
