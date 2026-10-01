import type { DataAppPresentation } from '@/src/core/presentation';
import { useRef, useLayoutEffect, useEffect, type ComponentRef } from 'react';
import {
  attachDataAppBridge,
  type DataAppHost,
  type DataAppConnection,
  type DataAppStatus,
  type DataAppDiagnostic,
} from '@/src/embed/host';
import type { MessageDispatcher } from '@/src/core/messages';

export type DataAppBridgeProps = {
  presentation?: DataAppPresentation;
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
  presentation,
  onStatusChange,
  onDiagnostic,
}: DataAppBridgeProps) {
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

  const identity =
    connection.type === 'origin' ? connection.origin : connection.token;
  const type = connection.type;

  useEffect(() => {
    const hostWindow = iframe?.ownerDocument.defaultView;
    if (!iframe || !hostWindow) return;

    const host = attachDataAppBridge({
      iframe,
      connection:
        type === 'origin'
          ? { type, origin: identity }
          : { type, token: identity },
      window: hostWindow,
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
    hostRef.current = host;

    return () => {
      hostRef.current = undefined;
      host.dispose();
    };
  }, [iframe, type, identity]);

  useEffect(() => {
    hostRef.current?.setPresentation(presentation);
  });

  return null;
}
