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
  /** `frame` (default): the parent sizes the iframe and the app scrolls inside it.
   * `content`: the iframe follows the app's content height and the parent page scrolls. */
  sizing?: 'frame' | 'content';
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
      isAnnotationPresentation(presentation.annotations)) &&
    (presentation.sizing === undefined ||
      presentation.sizing === 'frame' ||
      presentation.sizing === 'content')
  );
}
