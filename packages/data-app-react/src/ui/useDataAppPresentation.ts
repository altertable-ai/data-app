import { useEffect, useState } from 'react';
import {
  getDataAppTransport,
  type IframeTransport,
} from '@altertable/data-app/client';
import {
  localFrameBridge,
  isDataAppPresentation,
  type DataAppPresentation,
} from '@altertable/data-app/internal';

function presentationFromBridgeState(state: unknown) {
  const presentation =
    state && typeof state === 'object'
      ? (state as { presentation?: unknown }).presentation
      : undefined;

  return isDataAppPresentation(presentation) ? presentation : undefined;
}

/** Local preview verifies its parent before the UI attaches to its bridge. */
function attachDataAppTransport(
  attach: (bridge: IframeTransport) => () => void
) {
  let disposed = false;
  let detach: (() => void) | undefined;

  function connect(bridge: IframeTransport) {
    if (!disposed) detach = attach(bridge);
  }

  const bridge = getDataAppTransport();
  if (bridge) connect(bridge);
  else
    void localFrameBridge()
      ?.connect?.()
      .then(connect)
      .catch(() => {});

  return () => {
    disposed = true;
    detach?.();
  };
}

export function useDataAppPresentation() {
  const [presentation, setPresentation] = useState<
    DataAppPresentation | undefined
  >(() => presentationFromBridgeState(getDataAppTransport()?.snapshot()));

  useEffect(
    () =>
      attachDataAppTransport(bridge => {
        const unsubscribe = bridge.subscribe(state =>
          setPresentation(presentationFromBridgeState(state))
        );
        setPresentation(presentationFromBridgeState(bridge.snapshot()));
        return unsubscribe;
      }),
    []
  );

  return presentation;
}

/** The package styles keep layout and overlays within a content-sized frame. */
export function useContentSizingSupport() {
  useEffect(
    () =>
      attachDataAppTransport(
        // Bootstraps that predate content sizing cannot apply it.
        bridge => bridge.supportContentSizing?.() ?? (() => {})
      ),
    []
  );
}
