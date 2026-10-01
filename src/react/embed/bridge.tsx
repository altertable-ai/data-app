import type { DataAppHostContext } from '@/src/core/host-context';
import { useRef, useLayoutEffect, useEffect, type ComponentRef } from 'react';
import {
  attachDataAppBridge,
  type DataAppConnection,
  type DataAppStatus,
  type DataAppDiagnostic,
} from '@/src/embed/host';
import type { MessageDispatcher } from '@/src/core/messages';

export type DataAppBridgeProps = {
  hostContext?: DataAppHostContext;
  iframe: ComponentRef<'iframe'> | null;
  connection: DataAppConnection;
  onMessage: MessageDispatcher;
  onStatusChange?: (status: DataAppStatus) => void;
  onDiagnostic?: (event: DataAppDiagnostic) => void;
};

/** Delivery only; the host owns the iframe and route handlers, including navigation. */
export function DataAppBridge({
  iframe,
  connection,
  onMessage,
  hostContext,
  onStatusChange,
  onDiagnostic,
}: DataAppBridgeProps) {
  const attached = useRef<ReturnType<typeof attachDataAppBridge> | undefined>(
    undefined
  );
  const contextRef = useRef(hostContext);
  const handlers = useRef({ onMessage, onStatusChange, onDiagnostic });

  useLayoutEffect(() => {
    contextRef.current = hostContext;
    attached.current?.updateHostContext(hostContext);
    handlers.current = { onMessage, onStatusChange, onDiagnostic };
  });

  const identity =
    connection.type === 'origin' ? connection.origin : connection.token;
  const type = connection.type;

  useEffect(() => {
    const host = iframe?.ownerDocument.defaultView;
    if (!iframe || !host) return;

    const dispose = attachDataAppBridge({
      hostContext: contextRef.current,
      iframe,
      connection:
        type === 'origin'
          ? { type, origin: identity }
          : { type, token: identity },
      window: host,
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
    attached.current = dispose;

    return () => {
      attached.current = undefined;
      dispose();
    };
  }, [iframe, type, identity]);

  return null;
}
