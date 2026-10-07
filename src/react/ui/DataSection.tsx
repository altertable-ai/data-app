import { sectionContent, type ViewContent } from '@/src/react/content';
import { useContext, type ComponentPropsWithRef, type ReactNode } from 'react';
import { DataSectionBoundary } from '@/src/react/ui/DataSectionBoundary';
import {
  InspectionContext,
  useInspectionDefaults,
} from '@/src/react/ui/InspectionContext';
import {
  PrimaryViewContext,
  type ViewResult,
  useDeclaredResult,
} from '@/src/react/view-runtime';
import type { EmptyContent } from '@/src/react/ui/presentation';

export type DataSectionProps<Data, Input = unknown> = {
  content: ViewContent<Data, Input>;
  emptyFallback?: EmptyContent;
  error?: { title: ReactNode; description?: ReactNode; onRetry?: () => void };
  label?: string;
} & Omit<ComponentPropsWithRef<'div'>, 'children' | 'content'>;

export function DataSection<Data, Input>({
  content,
  ...presentation
}: DataSectionProps<Data, Input>) {
  const primary = useContext(PrimaryViewContext);
  const { view, ...section } = sectionContent(content);
  if (primary?.declaration === view) {
    // Identity proves the shared result belongs to this content's declaration.
    const result = primary.result as ViewResult<Data, Input>;
    return (
      <DataSectionBoundary
        {...section}
        {...presentation}
        result={result}
        notice="none"
      />
    );
  }
  return <IndependentSection view={view} {...section} {...presentation} />;
}

function IndependentSection<Data, Input>({
  view,
  ...props
}: Omit<DataSectionProps<Data, Input>, 'content'> &
  ReturnType<typeof sectionContent<Data, Input>>) {
  const result = useDeclaredResult(view);
  const defaults = useInspectionDefaults();
  const section = (
    <DataSectionBoundary {...props} result={result} notice="inline" />
  );
  return (
    <InspectionContext
      value={{
        ...defaults,
        dataContext: result.dataContext,
        queries: result.queries,
      }}
    >
      {section}
    </InspectionContext>
  );
}
