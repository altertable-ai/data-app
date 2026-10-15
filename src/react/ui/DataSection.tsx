import { DateFormattingContext } from '@/src/react/date-formatting';
import { ViewContent } from '@/src/react/content';
import { useContext, type ComponentPropsWithRef } from 'react';
import type { EmptyContent } from '@/src/react/ui/presentation';
import {
  InspectionContext,
  useInspectionDefaults,
} from '@/src/react/ui/InspectionContext';
import {
  PrimaryViewContext,
  type ViewResult,
  useDeclaredResult,
} from '@/src/react/view-runtime';

export type DataSectionProps<Data, Input = unknown> = {
  content: ViewContent<Data, Input>;
  emptyFallback?: EmptyContent;
  label?: string;
} & Omit<ComponentPropsWithRef<'div'>, 'children' | 'content'>;

/** Render the declared layout in every request state; bound widgets own recovery. */
function SectionContent<Data, Input>({
  content,
  result,
  emptyFallback,
  label,
  ...props
}: DataSectionProps<Data, Input> & { result: ViewResult<Data, Input> }) {
  return (
    <div {...props} role={label ? 'region' : undefined} aria-label={label}>
      {ViewContent.render(content, result, emptyFallback)}
    </div>
  );
}

export function DataSection<Data, Input>(props: DataSectionProps<Data, Input>) {
  const primary = useContext(PrimaryViewContext);
  const view = ViewContent.view(props.content);
  if (primary?.declaration === view) {
    return (
      <SectionContent
        {...props}
        result={primary.result as ViewResult<Data, Input>}
      />
    );
  }
  return <IndependentSection {...props} />;
}
function IndependentSection<Data, Input>(props: DataSectionProps<Data, Input>) {
  const result = useDeclaredResult(ViewContent.view(props.content));
  const defaults = useInspectionDefaults();
  return (
    <DateFormattingContext value={{ timeZone: result.timeZone }}>
      <InspectionContext
        value={{
          ...defaults,
          dataContext: result.dataContext,
          queries: result.queries,
        }}
      >
        <SectionContent {...props} result={result} />
      </InspectionContext>
    </DateFormattingContext>
  );
}
