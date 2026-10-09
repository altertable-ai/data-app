import { createContext, useContext } from 'react';
import type { DataAppConfig } from '@/src/core/config';
import { invariant } from '@/src/core/invariant';

export const DataAppContext = createContext<DataAppConfig | null>(null);

export function useDataApp() {
  const app = useContext(DataAppContext);
  invariant(app, 'Data app components require <DataAppProvider>.');
  return app;
}
