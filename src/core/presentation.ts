import type { Theme } from '@/src/core/appearance';

/** Presentation owned by the parent shell, delivered only over a trusted bridge. */
export type DataAppPresentation = {
  mount: 'altertable' | 'custom';
  theme: Theme;
};

export function parsePresentation(
  value: unknown
): DataAppPresentation | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const presentation = value as DataAppPresentation;
  if (
    (presentation.mount !== 'altertable' && presentation.mount !== 'custom') ||
    (presentation.theme !== 'light' && presentation.theme !== 'dark')
  )
    return undefined;

  return { mount: presentation.mount, theme: presentation.theme };
}
