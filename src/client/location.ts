import { PARENT_PARAM, validLocation } from '@/src/core/bridge';

export type AppLocation = { search: string; hash: string };
export type DataAppLocation = {
  snapshot(): AppLocation;
  subscribe(listener: () => void): () => void;
  update(location: AppLocation, mode?: 'push' | 'replace'): void;
};

/** Opaque sandboxes keep app state in memory; URL frames retain their real URL for HMR. */
export function createAppLocation(
  frame: Window,
  virtual: boolean,
  publish: (location: AppLocation, mode: 'push' | 'replace') => void
) {
  let state: AppLocation = { search: '', hash: '' };
  let disposed = false;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  function snapshot(): AppLocation {
    if (virtual) return state;
    const url = new URL(frame.location.href);
    url.searchParams.delete(PARENT_PARAM);
    if (state.search !== url.search || state.hash !== url.hash)
      state = { search: url.search, hash: url.hash };

    return state;
  }

  function apply(next: AppLocation) {
    const previous = snapshot();
    if (previous.search === next.search && previous.hash === next.hash) return;
    if (virtual) state = next;
    else {
      const url = new URL(frame.location.href);
      const parent = url.searchParams.get(PARENT_PARAM);
      url.search = next.search;
      if (parent) url.searchParams.set(PARENT_PARAM, parent);
      url.hash = next.hash;
      frame.history.replaceState(null, '', url);
      frame.dispatchEvent(new Event('popstate'));
    }
    if (virtual) notify();
  }

  const location: DataAppLocation = {
    snapshot,
    subscribe(listener) {
      listeners.add(listener);
      if (!virtual) frame.addEventListener('popstate', listener);

      return () => {
        listeners.delete(listener);
        frame.removeEventListener('popstate', listener);
      };
    },
    update(next, mode = 'replace') {
      if (disposed) return;
      if (!validLocation(next)) throw new Error('Invalid app location.');
      const before = snapshot();
      if (before.search === next.search && before.hash === next.hash) return;
      apply(next);
      publish(next, mode);
    },
  };

  function dispose() {
    disposed = true;
    for (const listener of listeners)
      frame.removeEventListener('popstate', listener);
    listeners.clear();
  }

  return { location, apply, dispose };
}
