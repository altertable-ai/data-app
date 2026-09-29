import { localFrameBridge } from '@/src/client/iframe';
const SEARCH_CHANGE = 'altertable:searchchange';

export function searchParams(): URLSearchParams {
  return new URLSearchParams(
    typeof window === 'undefined'
      ? ''
      : (localFrameBridge()?.appLocation?.snapshot().search ??
          window.location.search)
  );
}

/** Listen to Back/Forward and writes made by another runtime control. */
export function subscribeSearch(listener: () => void): () => void {
  const location = localFrameBridge()?.appLocation;
  if (location) return location.subscribe(listener);
  window.addEventListener('popstate', listener);
  window.addEventListener(SEARCH_CHANGE, listener);

  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(SEARCH_CHANGE, listener);
  };
}

/** Write search keys. `null` removes a key. Skips the history write when nothing changed. */
export function writeSearch(
  update: Record<string, string | null>,
  mode: 'replace' | 'push' = 'replace'
): void {
  const bridge = localFrameBridge();
  const location = bridge?.appLocation;
  const currentState = location?.snapshot();
  const url = new URL(window.location.href);
  if (currentState) {
    url.search = currentState.search;
    url.hash = currentState.hash;
  }
  for (const [key, value] of Object.entries(update)) {
    if (value == null || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  if (location) {
    location.update({ search: url.search, hash: url.hash }, mode);

    return;
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history[!bridge && mode === 'push' ? 'pushState' : 'replaceState'](
    null,
    '',
    next
  );
  bridge?.location(mode);
  window.dispatchEvent(new Event(SEARCH_CHANGE));
}

export function slug(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[^\w]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'item'
  );
}
