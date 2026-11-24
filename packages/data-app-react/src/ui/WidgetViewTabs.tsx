import { type ComponentPropsWithRef, type ReactNode } from 'react';

import { classNames } from './classNames.ts';
import { EmptyState } from './EmptyState.tsx';
import { type EmptyContent } from './presentation.ts';
import {
  SegmentedTab,
  SegmentedTabList,
  TabPanel,
  TabPanels,
  Tabs,
} from './Tabs.tsx';
import { validateWidgetViews } from './widget-views.ts';

export type WidgetView = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  emptyFallback: EmptyContent;
  isEmpty: boolean;
};
export type WidgetViewTabsProps<
  Views extends readonly WidgetView[] = readonly WidgetView[],
> = {
  label: string;
  views: Views;
  selectedKey: NoInfer<Views[number]['id']>;
  onSelectionChange: (key: Views[number]['id']) => void;
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

export function WidgetViewTabs<const Views extends readonly WidgetView[]>({
  label,
  views,
  selectedKey,
  onSelectionChange,
  className,
  ...props
}: WidgetViewTabsProps<Views>) {
  validateWidgetViews(views, selectedKey);

  return (
    <div
      {...props}
      className={classNames('altertable-widget-view-tabs', className)}
    >
      <Tabs
        selectedKey={selectedKey}
        onSelectionChange={key => onSelectionChange(String(key))}
      >
        <SegmentedTabList aria-label={label}>
          {views.map(view => (
            <SegmentedTab key={view.id} id={view.id}>
              {view.label}
            </SegmentedTab>
          ))}
        </SegmentedTabList>
        <TabPanels>
          {views.map(view => (
            <TabPanel key={view.id} id={view.id}>
              {view.isEmpty ? (
                <EmptyState {...view.emptyFallback} />
              ) : (
                view.content
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  );
}
