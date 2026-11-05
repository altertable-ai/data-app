import { useCallback, useState } from 'react';

/** Start requests slightly before a section scrolls into view so it is ready on arrival. */
const PREFETCH_MARGIN = '200px 0px';

/** Track whether an element has come within the prefetch margin of the viewport.
 * The answer latches to true: a section that has loaded keeps following its filters. */
export function useHasNearedViewport(): [
  ref: (element: Element | null) => (() => void) | undefined,
  hasNeared: boolean,
] {
  const [hasNeared, setHasNeared] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );
  const ref = useCallback(
    (element: Element | null) => {
      if (!element || hasNeared) return;
      const observer = new IntersectionObserver(
        entries => {
          if (entries.some(entry => entry.isIntersecting)) setHasNeared(true);
        },
        { rootMargin: PREFETCH_MARGIN }
      );
      observer.observe(element);
      return () => observer.disconnect();
    },
    [hasNeared]
  );
  return [ref, hasNeared];
}
