import { createContext } from 'react';
import type { ViewSource } from '@/src/react/bindings';

/** The supplied source drives frame feedback; this context never executes or discovers a request. */
export const WidgetSourceContext = createContext<{
  source: ViewSource<unknown, unknown>;
  renderFailed?: boolean;
} | null>(null);
