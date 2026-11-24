import { getDataAppNavigation } from '@altertable/data-app/client';
import { migrateAppUrlKeys } from '@altertable/data-app/internal';

const SEARCH_CHANGE = 'altertable:searchchange';

/** Current search with legacy runtime keys read as their `_`-prefixed keys. */
export function searchParams(): URLSearchParams {
  return migrateAppUrlKeys(
    typeof window === 'undefined'
      ? ''
      : (getDataAppNavigation()?.snapshot().search ?? window.location.search)
  );
}

/** Listen to Back/Forward and writes made by another runtime control. */
export function subscribeSearch(listener: () => void): () => void {
  const location = getDataAppNavigation();
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
  const location = getDataAppNavigation();
  const currentState = location?.snapshot();
  const url = new URL(window.location.href);
  if (currentState) url.hash = currentState.hash;
  // Writing rewrites legacy runtime keys, so a removed key cannot reappear from its old name.
  const params = searchParams();
  for (const [key, value] of Object.entries(update)) {
    if (value == null || value === '') params.delete(key);
    else params.set(key, value);
  }
  url.search = params.toString();
  if (location) {
    location.update({ search: url.search, hash: url.hash }, mode);

    return;
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](
    null,
    '',
    next
  );
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
