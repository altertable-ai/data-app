import { createContext, useContext } from 'react';
import type { DataAppConfig } from '@/src/core/config';
import { invariant } from '@/src/core/invariant';

export const DataAppContext = createContext<DataAppConfig | null>(null);

export function useDataApp() {
  const app = useContext(DataAppContext);
  // oxlint-disable-next-line data-app/no-runtime-assertion -- React context is resolved at render.
  invariant(app, 'Data app components require <DataAppProvider>.');
  return app;
}
