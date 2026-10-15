import { createContext, useContext } from 'react';
import { type DataAppConfig } from '@altertable/data-app/config';
import { invariant } from '@altertable/data-app/internal';

export const DataAppContext = createContext<DataAppConfig | null>(null);

export function useDataApp() {
  const app = useContext(DataAppContext);
  invariant(app, 'Data app components require <DataAppProvider>.');
  return app;
}
