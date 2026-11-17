import { type IframeTransport } from '@altertable/data-app/client';
import {
  isDataAppPresentation,
  type DataAppPresentation,
} from '@altertable/data-app/internal';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

function presentationFromBridgeState(state: unknown) {
  const presentation =
    state && typeof state === 'object'
      ? (state as { presentation?: unknown }).presentation
      : undefined;

  return isDataAppPresentation(presentation) ? presentation : undefined;
}

/** The frame UI shares one bridge connection for presentation and content sizing. */
export function useDataAppPresentation(
  transport: IframeTransport | undefined
): DataAppPresentation | undefined {
  const subscribe = useCallback(
    (listener: () => void) => transport?.subscribe(listener) ?? (() => {}),
    [transport]
  );
  const state = useSyncExternalStore(
    subscribe,
    () => transport?.snapshot(),
    () => undefined
  );

  // Bootstraps that predate content sizing cannot apply it.
  useEffect(() => transport?.supportContentSizing?.(), [transport]);

  return presentationFromBridgeState(state);
}
