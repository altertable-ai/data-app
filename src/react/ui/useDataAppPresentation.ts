import { useLayoutEffect, useState } from 'react';
import {
  getDataAppTransport,
  localFrameBridge,
  type IframeTransport,
} from '@/src/client/iframe';
import {
  parsePresentation,
  type DataAppPresentation,
} from '@/src/core/presentation';

function presentationFromBridgeState(state: unknown) {
  return parsePresentation(
    state && typeof state === 'object'
      ? (state as { presentation?: unknown }).presentation
      : undefined
  );
}

/** Local preview verifies its parent before accepting presentation context. */
export function useDataAppPresentation() {
  const [presentation, setPresentation] = useState<
    DataAppPresentation | undefined
  >(() => presentationFromBridgeState(getDataAppTransport()?.snapshot()));

  useLayoutEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    function attach(bridge: IframeTransport) {
      if (disposed) return;
      unsubscribe = bridge.subscribe(state =>
        setPresentation(presentationFromBridgeState(state))
      );
      setPresentation(presentationFromBridgeState(bridge.snapshot()));
    }

    const bridge = getDataAppTransport();
    if (bridge) attach(bridge);
    else
      void localFrameBridge()
        ?.connect?.()
        .then(attach)
        .catch(() => {});

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  return presentation;
}
