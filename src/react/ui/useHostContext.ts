import { useLayoutEffect, useState } from 'react';
import {
  getDataAppTransport,
  localFrameBridge,
  type IframeTransport,
} from '@/src/client/iframe';
import {
  parseHostContext,
  type DataAppHostContext,
} from '@/src/core/host-context';

function contextFromState(state: unknown) {
  return parseHostContext(
    state && typeof state === 'object'
      ? (state as { hostContext?: unknown }).hostContext
      : undefined
  );
}

/** Local preview verifies its parent before accepting presentation context. */
export function useHostContext() {
  const [context, setContext] = useState<DataAppHostContext | undefined>(() =>
    contextFromState(getDataAppTransport()?.snapshot())
  );

  useLayoutEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    function attach(bridge: IframeTransport) {
      if (disposed) return;
      unsubscribe = bridge.subscribe(state =>
        setContext(contextFromState(state))
      );
      setContext(contextFromState(bridge.snapshot()));
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

  return context;
}
