import {
  useCallback,
  useEffect,
  useState,
  type ComponentPropsWithRef,
} from 'react';
import { classNames } from '@/src/react/ui/classNames';
import {
  Tabs as AriaTabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from 'react-aria-components/Tabs';
import {
  searchParams,
  subscribeSearch,
  writeSearch,
} from '@/src/react/ui/search';

/** React Aria tabs with keyboard and ARIA behavior; pair each Tab and TabPanel by stable id. */
export { TabList, Tab, TabPanels, TabPanel };

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
