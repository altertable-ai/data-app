import { useLayoutEffect, useRef, type ComponentRef } from 'react';

/** Keep the latest supplied samples visible when the displayed items change. */
export function useChartScrollToEnd(items: readonly unknown[], enabled = true) {
  const scrollport = useRef<ComponentRef<'div'>>(null);
  useLayoutEffect(() => {
    const element = scrollport.current;
    if (element && enabled)
      element.scrollLeft = element.scrollWidth - element.clientWidth;
  }, [items, enabled]);
  return scrollport;
}
