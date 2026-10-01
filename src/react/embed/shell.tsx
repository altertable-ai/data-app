import {
  useEffect,
  useLayoutEffect,
  useRef,
  useReducer,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  attachDataAppShell,
  type DataAppSource,
  type DataAppShellOptions,
} from '@/src/embed/shell';
import type { DataAppStatus, DataAppHost } from '@/src/embed/host';

export type DataAppShellProps = Pick<
  DataAppShellOptions,
  | 'onMessage'
  | 'onStatusChange'
  | 'onDiagnostic'
  | 'startupTimeoutMs'
  | 'presentation'
> & {
  source: DataAppSource;
  title: string;
  loading?: ReactNode;
  renderError?: (retry: () => void) => ReactNode;
};

/** Source changes and retries replace the entire frame; handler changes retain its session. */
export function DataAppShell({
  source,
  title,
  onMessage,
  presentation,
  onStatusChange,
  onDiagnostic,
  startupTimeoutMs,
  loading,
  renderError,
}: DataAppShellProps) {
  const [iframe, setIframe] = useState<ComponentRef<'iframe'> | null>(null);
  const [attempt, bumpAttempt] = useReducer(value => value + 1, 0);
  const [status, setStatus] = useState<DataAppStatus>('connecting');
  const hostRef = useRef<DataAppHost | undefined>(undefined);
  const handlers = useRef({
    onMessage,
    onStatusChange,
    onDiagnostic,
  });

  useLayoutEffect(() => {
    handlers.current = {
      onMessage,
      onStatusChange,
      onDiagnostic,
    };
  });

  const url = source.type === 'url' ? source.url : source.bootstrapUrl;
  const javascript = source.type === 'bundle' ? source.javascript : undefined;
  const revision = source.type === 'bundle' ? source.revision : undefined;
  const type = source.type;
  const key = JSON.stringify([type, url, revision, javascript, attempt]);

  useEffect(() => {
    if (!iframe) return;

    const host = attachDataAppShell({
      iframe,
      source:
        type === 'url'
          ? { type, url }
          : {
              type,
              bootstrapUrl: url,
              javascript: javascript!,
              revision: revision!,
            },
      startupTimeoutMs,
      onMessage(message, context) {
        return handlers.current.onMessage(message, context);
      },
      onDiagnostic(event) {
        return handlers.current.onDiagnostic?.(event);
      },
      onStatusChange(value) {
        setStatus(value);
        handlers.current.onStatusChange?.(value);
      },
    });
    hostRef.current = host;

    return () => {
      hostRef.current = undefined;
      host.dispose();
    };
  }, [iframe, type, url, javascript, revision, startupTimeoutMs]);

  useEffect(() => {
    hostRef.current?.setPresentation(presentation);
  });

  function retry() {
    setStatus('connecting');
    bumpAttempt();
  }

  return (
    <>
      {status !== 'ready' && status !== 'failed' && loading && (
        <output>{loading}</output>
      )}
      {status === 'failed' &&
        (renderError?.(retry) ?? (
          <div role="alert">
            Could not load the data app. <button onClick={retry}>Retry</button>
          </div>
        ))}
      <iframe
        key={key}
        ref={setIframe}
        title={title}
        hidden={status !== 'ready'}
      />
    </>
  );
}
