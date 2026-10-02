import {
  useRef,
  useLayoutEffect,
  useEffect,
  useState,
  type ComponentRef,
  type ComponentPropsWithoutRef,
} from 'react';
import {
  attachDataAppBridge,
  type DataAppBridgeOptions,
} from '@/src/embed/bridge';
import type { DataAppConnection, DataAppHost } from '@/src/embed/host';
import type { DataAppSource } from '@/src/embed/source';

export type DataAppBridgeProps = Pick<
  DataAppBridgeOptions,
  'onMessage' | 'onStatusChange' | 'onDiagnostic' | 'presentation' | 'logger'
> &
  (
    | {
        source: DataAppSource;
        title: string;
        startupTimeoutMs?: number;
        iframeProps?: Omit<
          ComponentPropsWithoutRef<'iframe'>,
          | 'src'
          | 'srcDoc'
          | 'sandbox'
          | 'referrerPolicy'
          | 'loading'
          | 'children'
          | 'title'
        >;
        iframe?: never;
        connection?: never;
      }
    | {
        iframe: ComponentRef<'iframe'> | null;
        connection: DataAppConnection;
        source?: never;
        title?: never;
        startupTimeoutMs?: never;
        iframeProps?: never;
      }
  );

/** Owns iframe setup and delivery. The consuming shell owns loading, error UI, and retries. */
export function DataAppBridge(props: DataAppBridgeProps) {
  if (props.source) {
    const source = props.source;
    const identity = JSON.stringify(
      source.type === 'url'
        ? [source.type, source.url]
        : [source.type, source.bootstrapUrl, source.javascript]
    );

    return <SourceBridge key={identity} {...props} />;
  }

  return <ConnectionBridge {...props} />;
}

type SourceBridgeProps = Extract<DataAppBridgeProps, { source: DataAppSource }>;
type ConnectionBridgeProps = Extract<
  DataAppBridgeProps,
  { connection: DataAppConnection }
>;

function useBridgeState(props: DataAppBridgeProps) {
  const hostRef = useRef<DataAppHost | undefined>(undefined);
  const handlers = useRef(props);

  useLayoutEffect(() => {
    handlers.current = props;
  });

  useEffect(() => {
    hostRef.current?.setPresentation(props.presentation);
    hostRef.current?.setLogger(props.logger);
  });

  return { hostRef, handlers };
}

function SourceBridge(props: SourceBridgeProps) {
  const { source, title, iframeProps, startupTimeoutMs } = props;
  const [iframe, setIframe] = useState<ComponentRef<'iframe'> | null>(null);
  const { hostRef, handlers } = useBridgeState(props);
  const type = source.type;
  const url = source.type === 'url' ? source.url : source.bootstrapUrl;
  const javascript = source.type === 'bundle' ? source.javascript : undefined;

  useEffect(() => {
    if (!iframe) return;

    const bridge = attachDataAppBridge({
      iframe,
      source:
        type === 'url'
          ? { type, url }
          : {
              type,
              bootstrapUrl: url,
              javascript: javascript!,
            },
      startupTimeoutMs,
      presentation: handlers.current.presentation,
      logger: handlers.current.logger,
      onMessage(request, context) {
        return handlers.current.onMessage(request, context);
      },
      onStatusChange(status) {
        return handlers.current.onStatusChange?.(status);
      },
      onDiagnostic(event) {
        return handlers.current.onDiagnostic?.(event);
      },
    });
    hostRef.current = bridge;

    return () => {
      hostRef.current = undefined;
      bridge.dispose();
    };
  }, [iframe, type, url, javascript, startupTimeoutMs, hostRef, handlers]);

  return (
    <iframe {...iframeProps} loading="eager" ref={setIframe} title={title} />
  );
}

function ConnectionBridge(props: ConnectionBridgeProps) {
  const { iframe, connection } = props;
  const { hostRef, handlers } = useBridgeState(props);
  const identity =
    connection.type === 'origin' ? connection.origin : connection.token;
  const type = connection.type;

  useEffect(() => {
    const host = iframe?.ownerDocument.defaultView;
    if (!iframe || !host) return;

    const bridge = attachDataAppBridge({
      iframe,
      connection:
        type === 'origin'
          ? { type, origin: identity }
          : { type, token: identity },
      window: host,
      presentation: handlers.current.presentation,
      logger: handlers.current.logger,
      onMessage(request, context) {
        return handlers.current.onMessage(request, context);
      },
      onStatusChange(status) {
        return handlers.current.onStatusChange?.(status);
      },
      onDiagnostic(event) {
        return handlers.current.onDiagnostic?.(event);
      },
    });
    hostRef.current = bridge;

    return () => {
      hostRef.current = undefined;
      bridge.dispose();
    };
  }, [iframe, type, identity, hostRef, handlers]);

  return null;
}
