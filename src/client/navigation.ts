import type { AppLocation, HistoryMode } from '@/src/core/navigation';
import { createAppLocation, type DataAppLocation } from '@/src/client/location';
import { validLocation } from '@/src/core/navigation';
import {
  navigationUpdateRoute,
  type NavigationUpdate,
} from '@/src/core/messages';
import { createMessageClient } from '@/src/client/messages';
import {
  getDataAppTransport,
  localFrameBridge,
  type IframeTransport,
} from '@/src/client/iframe';

export type DataAppNavigation = DataAppLocation & {
  /** Publish URL changes made outside the adapter, including the document title. */
  publish(mode?: HistoryMode): void;
  dispose(): void;
};

/** Attach app URL behavior to an already authenticated bridge. */
export function createDataAppNavigation({
  bridge,
  window: frame = window,
}: {
  bridge: IframeTransport;
  window?: Window;
}): DataAppNavigation {
  return attachNavigation(frame, bridge.mode === 'bundle', bridge).navigation;
}

function attachNavigation(
  frame: Window,
  virtual: boolean,
  connection: IframeTransport | Promise<IframeTransport>
) {
  let disposed = false;
  let unsubscribe: (() => void) | undefined;
  let send: ((update: NavigationUpdate) => void) | undefined;
  let pendingUpdate: NavigationUpdate | undefined;
  const { location, apply, dispose } = createAppLocation(
    frame,
    virtual,
    publish
  );

  function publish(location: AppLocation, mode: HistoryMode) {
    const update = { ...location, mode, title: frame.document.title };
    if (send) send(update);
    else pendingUpdate = update;
  }

  function attach(bridge: IframeTransport) {
    if (disposed) return;
    unsubscribe?.();
    const messages = createMessageClient(
      { 'navigation:update': navigationUpdateRoute },
      bridge.request
    );

    function sendUpdate(update: NavigationUpdate) {
      void messages.request('navigation:update', update).catch(() => {});
    }

    function receiveState(state: unknown) {
      if (!validLocation(state)) return;
      pendingUpdate = undefined;
      apply(state);
    }

    send = sendUpdate;
    unsubscribe = bridge.subscribe(receiveState);
    receiveState(bridge.snapshot());
    if (pendingUpdate) {
      sendUpdate(pendingUpdate);
      pendingUpdate = undefined;
    }
  }

  if ('then' in connection) void connection.then(attach).catch(() => {});
  else attach(connection);

  const navigation: DataAppNavigation = {
    ...location,
    publish(mode = 'replace') {
      if (!disposed) publish(location.snapshot(), mode);
    },
    dispose() {
      disposed = true;
      unsubscribe?.();
      dispose();
      send = undefined;
      pendingUpdate = undefined;
    },
  };

  return {
    navigation,
    attach,
    isDisposed() {
      return disposed;
    },
  };
}

const navigationKey = Symbol.for('altertable.appNavigation');
type NavigationWindow = Window & {
  [navigationKey]?: ReturnType<typeof attachNavigation> & {
    bridge?: IframeTransport;
  };
};

/** URL controls attach navigation on demand; bootstrap and data-only clients do not. */
export function getDataAppNavigation(
  frame: Window = window
): DataAppNavigation | undefined {
  const target = frame as NavigationWindow;
  const bridge = getDataAppTransport(frame);
  const cached = target[navigationKey]?.isDisposed()
    ? undefined
    : target[navigationKey];
  if (cached) {
    if (bridge && cached.bridge !== bridge) {
      cached.attach(bridge);
      cached.bridge = bridge;
    }

    return cached.navigation;
  }
  if (bridge) {
    const adapter = attachNavigation(frame, bridge.mode === 'bundle', bridge);
    target[navigationKey] = { bridge, ...adapter };

    return adapter.navigation;
  }
  const preview = localFrameBridge(frame);
  if (!preview?.connect) return undefined;
  const connection = preview.connect();
  const adapter = attachNavigation(frame, false, connection);
  const entry = {
    ...adapter,
    bridge: undefined as IframeTransport | undefined,
  };
  target[navigationKey] = entry;
  void connection
    .then(bridge => {
      entry.bridge = bridge;
    })
    .catch(() => {});

  return adapter.navigation;
}
