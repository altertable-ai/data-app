import { useContext, type ComponentPropsWithRef, type ReactNode } from 'react';

import { sectionContent, type ViewContent } from '../content.ts';
import { DateFormattingContext } from '../date-formatting.ts';
import {
  PrimaryViewContext,
  type ViewResult,
  useDeclaredResult,
} from '../view-runtime.tsx';
import { DataSectionBoundary } from './DataSectionBoundary.tsx';
import {
  InspectionContext,
  useInspectionDefaults,
} from './InspectionContext.tsx';
import { type EmptyContent } from './presentation.ts';

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
    <DateFormattingContext value={{ timeZone: result.timeZone }}>
      <InspectionContext
        value={{
          ...defaults,
          dataContext: result.dataContext,
          queries: result.queries,
        }}
      >
        {section}
      </InspectionContext>
    </DateFormattingContext>
  );
}
