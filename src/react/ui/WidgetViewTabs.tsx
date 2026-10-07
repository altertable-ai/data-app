import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@/src/react/ui/Tabs';
import { EmptyState } from '@/src/react/ui/EmptyState';
import type { EmptyContent } from '@/src/react/ui/presentation';
import { classNames } from '@/src/react/ui/classNames';
import { validateWidgetViews } from '@/src/react/ui/widget-views';

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
        <TabList aria-label={label}>
          {views.map(view => (
            <Tab key={view.id} id={view.id}>
              {view.label}
            </Tab>
          ))}
        </TabList>
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
