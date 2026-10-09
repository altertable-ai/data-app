import { useState, type ComponentType, type ReactNode } from 'react';
import { DataAppContext } from '@/src/react/app-context';
import { InspectionProvider } from '@/src/react/ui/InspectionProvider';
import { getDataAppTransport } from '@/src/client/iframe';
import { getDataAppNavigation } from '@/src/client/navigation';
import { createRoot } from 'react-dom/client';
import { invariant } from '@/src/core/invariant';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  dataAppTitle,
  type DataAppDefinition,
  type QueryDefinitions,
} from '@/src/core/config';

/** Mount once per document; installs document identity and the shared request provider. */
export function mountDataApp<const Queries extends QueryDefinitions>({
  app,
  component: Component,
  root = document.getElementById('root'),
}: {
  app: DataAppDefinition<Queries>;
  component: ComponentType;
  root?: HTMLElement | null;
}): void {
  invariant(root, 'Data app root element is missing.');
  document.documentElement.lang = navigator.language;
  document.title = dataAppTitle(app);
  getDataAppNavigation();
  createRoot(root, {
    onUncaughtError(error) {
      console.error(error);
      getDataAppTransport()?.fail();
    },
  }).render(
    <DataAppProvider app={app}>
      <Component />
    </DataAppProvider>
  );
}

/** Provide one app identity and shared requests to a custom React root. */
export function DataAppProvider<const Queries extends QueryDefinitions>({
  app,
  children,
}: {
  app: DataAppDefinition<Queries>;
  children: ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      })
  );

  return (
    <DataAppContext value={app}>
      <QueryClientProvider client={client}>
        <InspectionProvider>{children}</InspectionProvider>
      </QueryClientProvider>
    </DataAppContext>
  );
}
