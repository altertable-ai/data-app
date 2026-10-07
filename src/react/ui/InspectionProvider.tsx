import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  searchParams,
  subscribeSearch,
  writeSearch,
} from '@/src/react/ui/search';
import {
  InspectionSheet,
  type AboutDataProps,
  type AboutTab,
} from '@/src/react/ui/AboutData';

type Inspection = {
  key: string;
  id: string;
  props: AboutDataProps;
  trigger: RefObject<HTMLButtonElement | null>;
};
type Selection = {
  inspection: Inspection;
  open: boolean;
  tab: AboutTab;
} | null;

/** One selected subject and one sheet, even when several widgets reuse its evidence. */
function createInspectionStore() {
  const subjects = new Map<string, Inspection>();
  const listeners = new Set<() => void>();
  let selection: Selection = null;
  function publish(next: Selection) {
    if (next === selection) return;
    const previous = selection;
    selection = next;
    if (
      previous?.open &&
      previous.inspection.props.open === undefined &&
      (!next?.open || previous.inspection.key !== next.inspection.key)
    )
      previous.inspection.props.onOpenChange?.(false);
    if (
      next?.open &&
      next.inspection.props.open === undefined &&
      (!previous?.open || previous.inspection.key !== next.inspection.key)
    )
      next.inspection.props.onOpenChange?.(true);
    listeners.forEach(listener => listener());
  }
  function sync() {
    const params = searchParams();
    const id = params.get('about');
    const inspection =
      selection && subjects.get(selection.inspection.key)?.id === id
        ? subjects.get(selection.inspection.key)
        : [...subjects.values()].find(subject => subject.id === id);
    const tab = params.get('tab') === 'queries' ? 'queries' : 'glossary';
    if (inspection?.props.open === false) inspection.props.onOpenChange?.(true);
    else if (inspection) publish({ inspection, open: true, tab });
    else if (selection?.open) {
      if (selection.inspection.props.open === true)
        selection.inspection.props.onOpenChange?.(false);
      else publish({ ...selection, open: false });
    }
  }
  function show(inspection: Inspection) {
    const tab = inspection.props.tab ?? 'glossary';
    publish({ inspection, open: true, tab });
    writeSearch(
      { about: inspection.id, tab },
      searchParams().get('about') === inspection.id ? 'replace' : 'push'
    );
  }
  function dismiss(key: string) {
    if (!selection?.open || selection.inspection.key !== key) return;
    publish({ ...selection, open: false });
    if (searchParams().get('about') === selection.inspection.id)
      writeSearch({ about: null, tab: null });
  }
  return {
    subscribe(this: void, listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => selection,
    sync,
    register(inspection: Inspection) {
      const previous = subjects.get(inspection.key);
      subjects.set(inspection.key, inspection);
      if (selection?.inspection.key === inspection.key)
        publish({ ...selection, inspection });
      else if (
        (!previous || previous.id !== inspection.id) &&
        !selection?.open &&
        searchParams().get('about') === inspection.id
      )
        sync();
    },
    remove(key: string) {
      subjects.delete(key);
      if (selection?.inspection.key === key)
        publish({ ...selection, open: false });
    },
    open(inspection: Inspection) {
      if (inspection.props.open !== undefined)
        inspection.props.onOpenChange?.(true);
      else show(inspection);
    },
    close(key: string) {
      if (!selection?.open || selection.inspection.key !== key) return;
      if (selection.inspection.props.open !== undefined)
        selection.inspection.props.onOpenChange?.(false);
      else dismiss(key);
    },
    controlled(inspection: Inspection, open: boolean | undefined) {
      if (open === true) show(inspection);
      else if (open === false) dismiss(inspection.key);
    },
    selectTab(this: void, tab: AboutTab) {
      if (!selection) return;
      publish({ ...selection, tab });
      if (selection.open) writeSearch({ about: selection.inspection.id, tab });
    },
  };
}

export const InspectionOwner = createContext<ReturnType<
  typeof createInspectionStore
> | null>(null);
export const InspectionVisual = createContext(false);

export function InspectionProvider({ children }: { children: ReactNode }) {
  const parent = useContext(InspectionOwner);
  const [store] = useState(createInspectionStore);
  if (parent) return children;
  return (
    <InspectionOwner value={store}>
      {children}
      <InspectionHost />
    </InspectionOwner>
  );
}

function InspectionHost() {
  const store = useContext(InspectionOwner)!;
  const selection = useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    () => null
  );
  useEffect(() => subscribeSearch(store.sync), [store]);
  if (!selection) return null;
  const { inspection, open, tab } = selection;
  return (
    <InspectionVisual value={true}>
      <InspectionSheet
        {...inspection.props}
        open={open}
        tab={tab}
        returnFocus={inspection.trigger}
        onOpenChange={next =>
          next ? store.open(inspection) : store.close(inspection.key)
        }
        onTabChange={store.selectTab}
      />
    </InspectionVisual>
  );
}
