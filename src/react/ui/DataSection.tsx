import { useContext, type ComponentPropsWithRef, type ReactNode } from 'react';
import { DataSectionBoundary } from '@/src/react/ui/DataSectionBoundary';
import {
  InspectionContext,
  useInspectionDefaults,
} from '@/src/react/ui/InspectionContext';
import {
  PrimaryViewContext,
  type DeclaredView,
  type ViewResult,
  useDeclaredResult,
} from '@/src/react/view-runtime';
import type { EmptyContent } from '@/src/react/ui/presentation';

export type DataSectionProps<Data, Input = unknown> = {
  view: DeclaredView<Data, Input>;
  children: (data: Data, input: Input) => ReactNode;
  loadingFallback: ReactNode;
  emptyFallback?: EmptyContent;
  error?: { title: ReactNode; description?: ReactNode; onRetry?: () => void };
  label?: string;
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

export function DataSection<Data, Input>(props: DataSectionProps<Data, Input>) {
  const primary = useContext(PrimaryViewContext);
  if (primary?.declaration === props.view) {
    // Identity proves this result belongs to the same typed declaration.
    const result = primary.result as ViewResult<Data, Input>;
    const { view: _, ...boundary } = props;
    return <DataSectionBoundary {...boundary} result={result} notice="none" />;
  }
  return <IndependentSection {...props} />;
}

function IndependentSection<Data, Input>({
  view,
  ...props
}: DataSectionProps<Data, Input>) {
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
