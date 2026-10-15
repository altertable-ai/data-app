import {
  useCallback,
  useEffect,
  useState,
  type ComponentPropsWithRef,
  type RefAttributes,
} from 'react';
import { useMergeRefs } from '@floating-ui/react';
import { classNames } from './classNames.ts';
import { useScrollFade } from './GradientScroll.tsx';
import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  type TabListProps,
  Tab as AriaTab,
  TabPanels,
  TabPanel as AriaTabPanel,
} from 'react-aria-components/Tabs';
import { searchParams, subscribeSearch, writeSearch } from './search.ts';

/** React Aria tabs with keyboard and ARIA behavior; pair each Tab and TabPanel by stable id. */
export { TabPanels };

export function TabList<T>({
  className,
  ref,
  ...props
}: TabListProps<T> & RefAttributes<HTMLDivElement>) {
  const scroll = useScrollFade('horizontal');
  const mergedRef = useMergeRefs([scroll.ref, ref]);

  return (
    <AriaTabList
      {...props}
      ref={mergedRef}
      data-axis="horizontal"
      data-fade-start={scroll.edges.start ? '' : undefined}
      data-fade-end={scroll.edges.end ? '' : undefined}
      className={state =>
        classNames(
          state.orientation === 'horizontal' && 'altertable-gradient-scroll',
          typeof className === 'function'
            ? className(state)
            : (className ?? 'react-aria-TabList')
        )
      }
    />
  );
}

export function Tab(props: ComponentPropsWithRef<typeof AriaTab>) {
  return (
    <AriaTab
      data-atbl-internal-surface="tab"
      data-atbl-focus="ring"
      data-atbl-control="action"
      {...props}
    />
  );
}

export function TabPanel(props: ComponentPropsWithRef<typeof AriaTabPanel>) {
  return <AriaTabPanel data-atbl-focus="ring" {...props} />;
}

export function Tabs({
  className,
  ...props
}: ComponentPropsWithRef<typeof AriaTabs>) {
  return (
    <AriaTabs
      {...props}
      className={state =>
        classNames(
          'altertable-tabs',
          typeof className === 'function'
            ? className(state)
            : (className ?? 'react-aria-Tabs')
        )
      }
    />
  );
}

/** Keep a page-level tab in `?view=`; reserve `?tab=` for the inspect sheet. */
export function useViewTab<View extends string>(
  views: readonly View[],
  fallback: View
): [View, (key: string | number) => void] {
  const currentView = useCallback((): View => {
    const requested = searchParams().get('view') as View;

    return views.includes(requested) ? requested : fallback;
  }, [views, fallback]);

  const [selected, setSelected] = useState<View>(currentView);

  useEffect(() => {
    function sync() {
      const view = currentView();
      setSelected(view);
      if (searchParams().get('view') !== view) writeSearch({ view });
    }

    sync();

    return subscribeSearch(sync);
  }, [currentView]);

  function select(key: string | number) {
    const view = String(key) as View;
    if (!views.includes(view)) return;
    setSelected(view);
    writeSearch({ view }, 'push');
  }

  return [selected, select];
}
