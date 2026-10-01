/** App-owned URL state shared by controls, frame adapters, and host navigation. */
export type AppLocation = { search: string; hash: string };
export type HistoryMode = 'push' | 'replace';
export type NavigationUpdate = AppLocation & {
  mode: HistoryMode;
  title?: string;
};

export function validLocation(value: unknown): value is AppLocation {
  if (!value || typeof value !== 'object') return false;
  const message = value as { search?: unknown; hash?: unknown };
  return (
    typeof message.search === 'string' &&
    message.search.length <= 16_384 &&
    (message.search === '' || message.search.startsWith('?')) &&
    typeof message.hash === 'string' &&
    message.hash.length <= 4096 &&
    (message.hash === '' || message.hash.startsWith('#'))
  );
}
