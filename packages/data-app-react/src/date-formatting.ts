import { createContext, useContext } from 'react';

import { DataAppContext } from './app-context.ts';

/** The reporting zone belongs to the displayed view, not the browser. */
export const DateFormattingContext = createContext<{ timeZone?: string }>({});

/** Resolve date display defaults for custom charts and narrative. Explicit options override the view and app. */
export function useDateFormatting(
  options: { locale?: string; timeZone?: string } = {}
) {
  const app = useContext(DataAppContext);
  const view = useContext(DateFormattingContext);
  return {
    locale: options.locale ?? app?.dateFormatting?.locale ?? 'en-US',
    timeZone:
      options.timeZone ??
      view.timeZone ??
      app?.dateFormatting?.timeZone ??
      'UTC',
  };
}
