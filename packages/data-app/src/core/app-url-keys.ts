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
