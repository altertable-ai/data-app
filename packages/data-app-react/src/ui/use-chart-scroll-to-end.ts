import { useLayoutEffect, useRef, type ComponentRef } from 'react';

/** Keep the latest supplied samples visible when the displayed items change. */
export function useChartScrollToEnd(items: readonly unknown[]) {
  const scrollport = useRef<ComponentRef<'div'>>(null);
  useLayoutEffect(() => {
    const element = scrollport.current;
    if (element) element.scrollLeft = element.scrollWidth - element.clientWidth;
  }, [items]);
  return scrollport;
}
