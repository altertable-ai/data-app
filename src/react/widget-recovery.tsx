import { Component, useContext, type ReactNode } from 'react';
import { invariant } from '@/src/core/invariant';
import { RegisteredBinding, type ViewSource } from '@/src/react/bindings';
import { ownedSource } from '@/src/react/source-owner';
import { ViewResultsContext } from '@/src/react/view-runtime';
import { WidgetRequestContext } from '@/src/react/widget-request';
import { DateFormattingContext } from '@/src/react/date-formatting';
import {
  InspectionContext,
  useInspectionDefaults,
} from '@/src/react/ui/InspectionContext';
import { DataWidget, type DataWidgetProps } from '@/src/react/ui/DataWidget';
import { StatusPanel } from '@/src/react/ui/StatusPanel';
import { Button } from '@/src/react/ui/Button';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';

/** Reset rendering locally; a new displayed result also clears a previous render failure. */
class RenderRecovery extends Component<
  {
    resetKey: unknown;
    fallback: (retry: () => void) => ReactNode;
    children: ReactNode;
  },
  { failed: boolean; resetKey: unknown }
> {
  state = { failed: false, resetKey: this.props.resetKey };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(
    props: { resetKey: unknown },
    state: { resetKey: unknown }
  ) {
    return !Object.is(props.resetKey, state.resetKey)
      ? { failed: false, resetKey: props.resetKey }
      : null;
  }
  override render() {
    return this.state.failed
      ? this.props.fallback(() => this.setState({ failed: false }))
      : this.props.children;
  }
}

export function WidgetRecovery<Data, Input>({
  binding,
  source,
  title,
  description,
  evidence,
  action,
  inline,
  frame,
  children,
}: {
  binding: RegisteredBinding;
  source?: ViewSource<Data, Input>;
  title: ReactNode;
  description?: ReactNode;
  evidence?: WidgetEvidence;
  action?: ReactNode;
  inline?: boolean;
  frame?: Pick<
    DataWidgetProps,
    | 'headingLevel'
    | 'annotationId'
    | 'id'
    | 'className'
    | 'style'
    | 'aria-label'
    | 'aria-labelledby'
  >;
  children: (source: ViewSource<Data, Input>) => ReactNode;
}) {
  const results = useContext(ViewResultsContext);
  const defaults = useInspectionDefaults();
  const owner = RegisteredBinding.owner(binding);
  if (source) RegisteredBinding.assertSource(binding, source);
  const request = source ? undefined : results?.get(owner);
  invariant(
    source || request,
    'A widget without source must belong to a view registered on DataApp.'
  );
  const displayed: ViewSource<Data, Input> =
    source ??
    ownedSource(owner, request!.snapshot ?? { loading: true as const });
  const content = (
    <RenderRecovery
      resetKey={
        request?.revision ?? (displayed.loading ? undefined : displayed.data)
      }
      fallback={retry =>
        inline ? (
          <span role="alert">
            Couldn’t display value. <Button onClick={retry}>Retry</Button>
          </span>
        ) : (
          <WidgetRequestContext
            value={request ? { ...request, renderFailed: true } : null}
          >
            <DataWidget
              headingLevel={frame?.headingLevel}
              annotationId={frame?.annotationId}
              id={frame?.id}
              className={frame?.className}
              style={frame?.style}
              aria-label={frame?.['aria-label']}
              aria-labelledby={frame?.['aria-labelledby']}
              title={title}
              description={description}
              evidence={evidence}
              action={action}
            >
              <StatusPanel
                status="error"
                title="Couldn’t display this widget"
                description="Try again. If this continues, ask the app owner to fix the visualization."
                action={<Button onClick={retry}>Retry</Button>}
              />
            </DataWidget>
          </WidgetRequestContext>
        )
      }
    >
      <WidgetRequestContext value={request ?? null}>
        <RenderSource source={displayed}>{children}</RenderSource>
      </WidgetRequestContext>
    </RenderRecovery>
  );
  if (!request) return content;
  return (
    <DateFormattingContext value={{ timeZone: request.timeZone }}>
      <InspectionContext
        value={{
          ...defaults,
          dataContext: request.dataContext,
          queries: request.queries,
        }}
      >
        {inline &&
        (request.view.kind === 'error' || request.view.kind === 'empty') ? (
          <span role={request.view.kind === 'error' ? 'alert' : undefined}>
            Unavailable
          </span>
        ) : (
          content
        )}
      </InspectionContext>
    </DateFormattingContext>
  );
}

/** Invoke user selectors below the rendering boundary. */
function RenderSource<Data, Input>({
  source,
  children,
}: {
  source: ViewSource<Data, Input>;
  children: (source: ViewSource<Data, Input>) => ReactNode;
}) {
  return children(source);
}
