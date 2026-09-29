import { PARENT_PARAM } from '@/src/core/bridge';
import type { NavigationUpdate } from '@/src/core/messages';

/** Override this handler for framework routers. Reserved host parameters survive app navigation. */
export function createNavigationHandler({
  window: host = window,
  reservedSearchParams = [],
}: {
  window?: Window;
  reservedSearchParams?: readonly string[];
} = {}) {
  function navigate(input: NavigationUpdate): null {
    const previous = new URL(host.location.href);
    const url = new URL(previous);
    url.search = input.search;
    url.searchParams.delete(PARENT_PARAM);
    for (const name of reservedSearchParams) {
      url.searchParams.delete(name);
      for (const value of previous.searchParams.getAll(name))
        url.searchParams.append(name, value);
    }
    url.hash = input.hash;
    if (url.href !== host.location.href)
      host.history[input.mode === 'push' ? 'pushState' : 'replaceState'](
        null,
        '',
        url
      );
    if (input.title !== undefined) host.document.title = input.title;

    return null;
  }

  return navigate;
}
