import {
  getDataAppTransport,
  type IframeTransport,
} from '@altertable/data-app/client';
import {
  localFrameBridge,
  isDataAppPresentation,
  type DataAppPresentation,
} from '@altertable/data-app/internal';
import { useEffect, useState } from 'react';

function presentationFromBridgeState(state: unknown) {
  const presentation =
    state && typeof state === 'object'
      ? (state as { presentation?: unknown }).presentation
      : undefined;

  return isDataAppPresentation(presentation) ? presentation : undefined;
}

/** The frame UI shares one bridge connection for presentation and content sizing. */
export function useDataAppPresentation() {
  const [presentation, setPresentation] = useState<
    DataAppPresentation | undefined
  >(() => presentationFromBridgeState(getDataAppTransport()?.snapshot()));

  useEffect(() => {
    let disposed = false;
    let detach: (() => void) | undefined;

    function attach(bridge: IframeTransport) {
      if (disposed) return;
      const unsubscribe = bridge.subscribe(state =>
        setPresentation(presentationFromBridgeState(state))
      );
      // Bootstraps that predate content sizing cannot apply it.
      const releaseSizing = bridge.supportContentSizing?.();
      setPresentation(presentationFromBridgeState(bridge.snapshot()));
      detach = () => {
        unsubscribe();
        releaseSizing?.();
      };
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
      detach?.();
    };
  }, []);

  return presentation;
}
