import { createContext } from 'react';
import type { ViewResult } from '@/src/react/view-runtime';

/** Rendering recovery retains scope without presenting a second query recovery action. */
type WidgetRequest = ViewResult<unknown, unknown> & { renderFailed?: boolean };
export const WidgetRequestContext = createContext<WidgetRequest | null>(null);
