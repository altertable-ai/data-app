import {
  isAnnotationPresentation,
  type DataAppAnnotationPresentation,
} from './annotations.ts';
import { type Theme } from './appearance.ts';

/** Presentation owned by the parent shell, delivered only over a trusted bridge. */
export type DataAppPresentation = {
  surface: 'embedded' | 'standalone';
  theme: Theme;
  annotations?: DataAppAnnotationPresentation;
};

export function isDataAppPresentation(
  value: unknown
): value is DataAppPresentation {
  if (!value || typeof value !== 'object') return false;
  const presentation = value as DataAppPresentation;

  return (
    (presentation.surface === 'embedded' ||
      presentation.surface === 'standalone') &&
    (presentation.theme === 'light' || presentation.theme === 'dark') &&
    (presentation.annotations === undefined ||
      isAnnotationPresentation(presentation.annotations))
  );
}
