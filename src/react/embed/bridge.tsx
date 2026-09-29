import { useRef, useLayoutEffect, useEffect, type ComponentRef } from 'react';
import {
  attachDataAppBridge,
  type DataAppConnection,
  type DataAppStatus,
  type DataAppDiagnostic,
} from '@/src/embed/host';
import type { MessageDispatcher } from '@/src/core/messages';

export type DataAppBridgeProps = {
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
  onStatusChange,
  onDiagnostic,
}: DataAppBridgeProps) {
  const handlers = useRef({ onMessage, onStatusChange, onDiagnostic });

  useLayoutEffect(() => {
    handlers.current = { onMessage, onStatusChange, onDiagnostic };
  });

  const identity =
    connection.type === 'origin' ? connection.origin : connection.token;
  const type = connection.type;

  useEffect(() => {
    const host = iframe?.ownerDocument.defaultView;
    if (!iframe || !host) return;

    return attachDataAppBridge({
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
  }, [iframe, type, identity]);

  return null;
}
