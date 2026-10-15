import { Component, type ReactNode } from 'react';
import {
  RegisteredBinding,
  type ViewSource,
  type ReadableSource,
} from '@/src/react/bindings';
import { WidgetSourceContext } from '@/src/react/widget-source';
import { DataWidget, type DataWidgetProps } from '@/src/react/ui/DataWidget';
import { StatusPanel } from '@/src/react/ui/StatusPanel';
import { EmptyState } from '@/src/react/ui/EmptyState';
import { Button } from '@/src/react/ui/Button';
import { getDataFailure } from '@/src/react/data-failure';
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
  source: ViewSource<Data, Input>;
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
  children: (source: ReadableSource<Data, Input>) => ReactNode;
}) {
  RegisteredBinding.assertSource(binding, source);
  function shell(body: ReactNode, renderFailed = false) {
    return (
      <WidgetSourceContext value={{ source, renderFailed }}>
        <DataWidget
          {...frame}
          title={title}
          description={description}
          evidence={evidence}
          action={action}
        >
          {body}
        </DataWidget>
      </WidgetSourceContext>
    );
  }
  if (source.state === 'error') {
    const failure = getDataFailure(source.error);
    const retry = failure.retryable && source.refetch;
    return inline ? (
      <span role="alert">
        Unavailable
        {retry && (
          <Button variant="ghost" size="compact" onClick={() => void retry()}>
            Retry
          </Button>
        )}
      </span>
    ) : (
      shell(
        <StatusPanel
          status="error"
          title={failure.message}
          action={
            retry && (
              <Button
                variant="ghost"
                size="compact"
                onClick={() => void retry()}
              >
                Retry
              </Button>
            )
          }
        />
      )
    );
  }
  if (source.state === 'empty')
    return inline ? (
      <span>No results</span>
    ) : (
      shell(<EmptyState {...source.emptyFallback} />)
    );
  return (
    <RenderRecovery
      resetKey={
        source.revision ??
        (source.state === 'loading' ? undefined : source.data)
      }
      fallback={retry =>
        inline ? (
          <span role="alert">
            Couldn’t display value.{' '}
            <Button variant="ghost" size="compact" onClick={retry}>
              Retry
            </Button>
          </span>
        ) : (
          shell(
            <StatusPanel
              status="error"
              title="Couldn’t display results."
              action={
                <Button variant="ghost" size="compact" onClick={retry}>
                  Retry
                </Button>
              }
            />,
            true
          )
        )
      }
    >
      <WidgetSourceContext value={{ source }}>
        <RenderSource source={source}>{children}</RenderSource>
      </WidgetSourceContext>
    </RenderRecovery>
  );
}

/** User selectors execute below the render boundary and only receive readable states. */
function RenderSource<Data, Input>({
  source,
  children,
}: {
  source: ReadableSource<Data, Input>;
  children: (source: ReadableSource<Data, Input>) => ReactNode;
}) {
  return children(source);
}
