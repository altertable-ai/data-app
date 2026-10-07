import {
  useEffect,
  useEffectEvent,
  useRef,
  useContext,
  useId,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { invariant } from '@/src/core/invariant';
import { useMergeRefs } from '@floating-ui/react';
import { AppIcon } from '@/src/react/ui/icons';
import type { DisclosedQuery } from '@/src/core/contract';
import type { DataContext, GlossaryEntry } from '@/src/react/ui/data-context';
import { Button, type ButtonProps } from '@/src/react/ui/Button';
import { EmptyState } from '@/src/react/ui/EmptyState';
import { Kbd } from '@/src/react/ui/Kbd';
import { QueryList } from '@/src/react/ui/QueryList';
import { slug } from '@/src/react/ui/search';
import { Sheet, type SheetDialogProps } from '@/src/react/ui/Sheet';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/src/react/ui/Tabs';
import {
  ariaKeyShortcuts,
  shortcuts,
  useShortcut,
} from '@/src/react/ui/shortcuts';
import { Tooltip } from '@/src/react/ui/Tooltip';
import {
  InspectionOwner,
  InspectionVisual,
} from '@/src/react/ui/InspectionProvider';
import { useInspectionDefaults } from '@/src/react/ui/InspectionContext';

export type AboutTab = 'glossary' | 'queries';

const aboutTabs = new Map<string, AboutTab>([
  ['glossary', 'glossary'],
  ['queries', 'queries'],
]);

export function resolveAboutTab(tab: string | null | undefined): AboutTab {
  return aboutTabs.get(tab ?? '') ?? 'glossary';
}
export type AboutEmpty = {
  glossary: { title: string; description?: string };
  queries: { title: string; description?: string };
};

export const defaultAboutEmpty: AboutEmpty = {
  glossary: { title: 'No glossary terms for this view' },
  queries: { title: 'SQL is not available for this view' },
};

export type AboutSubject = {
  empty?: AboutEmpty;
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  visual?: ReactNode;
  visualKind?: 'metric' | 'chart' | 'widget';
  dataContext?: DataContext;
  references?:
    | {
        kind: 'ids';
        glossaryIds?: readonly string[];
        queryNames?: readonly string[];
      }
    | { kind: 'entries'; entries: readonly GlossaryEntry[] };
  queries?: DisclosedQuery[];
};

export type AboutDataProps = AboutSubject & {
  variant?: ButtonProps['variant'];
  iconOnly?: boolean;
  /**
   * Register the global inspect shortcut. Defaults on for existing toolbar triggers; local
   * triggers set false.
   */
  shortcut?: boolean;
  tooltip?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  portalRoot?: RefObject<HTMLElement | null>;
  sheetProps?: SheetDialogProps;
  headerActions?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Initial inspect tab. While open, the URL's `tab` parameter tracks selection. */
  tab?: AboutTab;
  trigger?: boolean;
} & Omit<ComponentPropsWithRef<'button'>, 'children' | 'title'>;

function namedGlossaryEntries(
  dataContext: DataContext | undefined,
  ids: readonly string[]
): GlossaryEntry[] {
  return ids.map(id => {
    const entry = dataContext?.glossary[id];
    invariant(entry, `Unknown glossary entry: ${id}.`);

    return entry;
  });
}

function listedGlossaryEntries({
  references,
  dataContext,
}: AboutSubject): GlossaryEntry[] {
  if (references?.kind === 'entries') return [...references.entries];
  if (references?.kind === 'ids' && references.glossaryIds)
    return namedGlossaryEntries(dataContext, references.glossaryIds);

  return Object.values(dataContext?.glossary ?? {});
}

function glossaryQueries(subject: AboutSubject): string[] | undefined {
  if (
    subject.references?.kind === 'ids' &&
    subject.references.queryNames?.length
  )
    return [...subject.references.queryNames];
  const names = listedGlossaryEntries(subject).flatMap(
    item => item.queryNames ?? []
  );

  return names.length ? names : undefined;
}

function subjectId({ id, title }: AboutSubject): string {
  if (id) return id;

  return typeof title === 'string' ? slug(title) : 'data';
}

function GlossaryDetail({ entry }: { entry: GlossaryEntry }) {
  return (
    <article className="altertable-about-glossary-entry">
      <h3>{entry.term}</h3>
      {entry.definition ? <p>{entry.definition}</p> : null}
    </article>
  );
}

/**
 * Open state uses `?about=`; tab selection uses `?tab=`. Enable the global shortcut only on the
 * page-level trigger.
 */
export function InspectionSheet({
  id,
  title,
  description,
  visual,
  visualKind,
  dataContext,
  references,
  queries,
  empty,
  footer,
  sheetProps,
  headerActions,
  open,
  onOpenChange,
  tab,
  onTabChange,
  returnFocus,
}: AboutDataProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: AboutTab;
  onTabChange: (tab: AboutTab) => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const defaults = useInspectionDefaults();
  const resolvedContext = dataContext ?? defaults?.dataContext;
  const resolvedQueries = queries ?? defaults?.queries;
  const resolvedEmpty = empty ?? defaults?.empty ?? defaultAboutEmpty;
  const subject = {
    id,
    title,
    description,
    visual,
    dataContext: resolvedContext,
    references,
    queries: resolvedQueries,
    empty: resolvedEmpty,
  };
  const listed = listedGlossaryEntries(subject);
  const names = glossaryQueries(subject);
  if (names && resolvedQueries?.length) {
    for (const name of names) {
      invariant(
        resolvedQueries.some(query => query.name === name),
        `Unknown query name: ${name}.`
      );
    }
  }
  const hasQueries = (resolvedQueries ?? []).some(
    query => !names || names.includes(query.name)
  );
  const heading = title ?? 'About the data';
  const summary =
    description ??
    resolvedContext?.description ??
    'Glossary and queries for this view.';
  return (
    <Sheet
      {...sheetProps}
      open={open}
      onOpenChange={onOpenChange}
      title={heading}
      description={summary}
      wide={!!visual && visualKind !== 'metric'}
      returnFocus={returnFocus}
      footer={footer}
      headerActions={headerActions}
    >
      {visual && (
        <div className="altertable-about-visual" data-kind={visualKind}>
          {visual}
        </div>
      )}
      <div className="altertable-about-body">
        <Tabs
          selectedKey={tab}
          onSelectionChange={key => onTabChange(resolveAboutTab(String(key)))}
          className="altertable-about-tabs"
        >
          <div className="altertable-about-tabbar">
            <TabList
              aria-label={
                typeof heading === 'string' ? heading : 'About the data'
              }
            >
              <Tab id="glossary">Glossary</Tab>
              <Tab id="queries">Queries</Tab>
            </TabList>
          </div>
          <TabPanels>
            <TabPanel id="glossary">
              {listed.length ? (
                <div className="altertable-about-glossary-list">
                  {listed.map(entry => (
                    <GlossaryDetail key={entry.term} entry={entry} />
                  ))}
                </div>
              ) : (
                <EmptyState {...resolvedEmpty.glossary} />
              )}
            </TabPanel>
            <TabPanel id="queries">
              {hasQueries ? (
                <QueryList queries={resolvedQueries} names={names} expanded />
              ) : (
                <EmptyState {...resolvedEmpty.queries} />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </Sheet>
  );
}

export function AboutData(props: AboutDataProps) {
  const owner = useContext(InspectionOwner);
  const visual = useContext(InspectionVisual);
  if (visual) return <span>{props.children ?? props.title}</span>;
  invariant(owner, 'Inspection requires DataApp or DataAppProvider.');
  return <InspectionTrigger {...props} />;
}

function InspectionTrigger({
  variant = 'ghost',
  iconOnly = false,
  shortcut = true,
  tooltip,
  children,
  portalRoot,
  trigger = true,
  className,
  onClick,
  ref,
  ...props
}: AboutDataProps) {
  const owner = useContext(InspectionOwner)!;
  const defaults = useInspectionDefaults();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mergedTrigger = useMergeRefs([triggerRef, ref]);
  const key = useId();
  const id = subjectId(props);
  const isOpen = useSyncExternalStore(
    owner.subscribe,
    () => {
      const selection = owner.snapshot();
      return !!selection?.open && selection.inspection.key === key;
    },
    () => false
  );
  const inspection = {
    key,
    id,
    trigger: triggerRef,
    props: {
      ...props,
      dataContext: props.dataContext ?? defaults?.dataContext,
      queries: props.queries ?? defaults?.queries,
      empty: props.empty ?? defaults?.empty,
    },
  };
  useEffect(() => owner.register(inspection));
  useEffect(() => () => owner.remove(key), [owner, key]);
  const syncControlled = useEffectEvent((open: boolean | undefined) => {
    owner.controlled(inspection, open);
  });
  useEffect(() => syncControlled(props.open), [props.open]);
  const enabled = trigger && shortcut && !props.disabled;
  useShortcut(shortcuts.aboutData, () => owner.open(inspection), enabled);
  const hint =
    tooltip ??
    (iconOnly ? (
      enabled ? (
        <>
          Explore data <Kbd shortcut={shortcuts.aboutData} />
        </>
      ) : (
        'Explore data'
      )
    ) : null);
  if (!trigger) return null;
  const {
    id: _subjectId,
    title,
    description: _description,
    visual: _visual,
    visualKind: _visualKind,
    dataContext: _dataContext,
    references: _references,
    queries: _queries,
    empty: _empty,
    footer: _footer,
    sheetProps: _sheetProps,
    headerActions: _headerActions,
    open: _open,
    onOpenChange: _onOpenChange,
    tab: _tab,
    ...buttonProps
  } = props;
  const button = (
    <Button
      {...buttonProps}
      ref={mergedTrigger}
      variant={variant}
      size={iconOnly ? 'icon' : 'default'}
      className={className}
      data-open={isOpen || undefined}
      aria-label={
        buttonProps['aria-label'] ??
        (iconOnly
          ? typeof title === 'string'
            ? `Explore ${title}`
            : 'Explore data'
          : undefined)
      }
      aria-keyshortcuts={
        buttonProps['aria-keyshortcuts'] ??
        (enabled ? ariaKeyShortcuts(shortcuts.aboutData) : undefined)
      }
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) owner.open(inspection);
      }}
    >
      {children ?? (
        <>
          <AppIcon name="info" />
          {!iconOnly && 'Explore details'}
        </>
      )}
    </Button>
  );
  return hint == null ? (
    button
  ) : (
    <Tooltip content={hint} portalRoot={portalRoot}>
      {button}
    </Tooltip>
  );
}
