/** Search keys the runtime owns. Filter keys cannot start with this prefix. */
export const APP_URL_KEY_PREFIX = '_';

export const appUrlKeys = {
  view: '_view',
  about: '_about',
  tab: '_tab',
  present: '_present',
  step: '_step',
  details: '_details',
  widget: '_widget',
  theme: '_theme',
} as const;

/** Unprefixed keys from links written before SDK 0.80.0. */
const legacyKeys = [
  'view',
  'about',
  'tab',
  'present',
  'step',
  'details',
] as const satisfies readonly (keyof typeof appUrlKeys)[];

export function isReservedUrlKey(key: string) {
  return (
    key.startsWith(APP_URL_KEY_PREFIX) ||
    (legacyKeys as readonly string[]).includes(key)
  );
}

/** Moves each legacy runtime key to its prefixed key unless the prefixed key is present. */
export function migrateAppUrlKeys(search: string): URLSearchParams {
  const params = new URLSearchParams(search);
  for (const legacy of legacyKeys) {
    if (!params.has(legacy)) continue;
    const key = appUrlKeys[legacy];
    const values = params.getAll(legacy);
    params.delete(legacy);
    if (params.has(key)) continue;
    for (const value of values) params.append(key, value);
  }
  return params;
}
