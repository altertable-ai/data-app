import { useState } from 'react';
import {
  DataApp,
  DataWidget,
  injectDataAppStyles,
  mountDataApp,
  type DataView,
} from '@altertable/data-app/react';
function App() {
  const [view, setView] = useState<DataView<number, { period: string }>>({
    kind: 'updating',
    data: 42,
    displayedInput: { period: 'last-30' },
    requestedInput: { period: 'last-7' },
    message: 'Updating results.',
  });
  return (
    <DataApp
      config={{
        title: 'Displayed context',
        scope: { organization: 'test', environment: 'prod' },
        appearance: { theme: 'system' },
      }}
      dataContext={{ description: 'Displayed context', glossary: {} }}
      request={{
        view,
        refetch() {},
        empty: { title: 'No results' },
        controls: (
          <button
            onClick={() =>
              setView({
                kind: 'ready',
                data: 84,
                input: { period: 'last-365' },
              })
            }
          >
            Change displayed period
          </button>
        ),
      }}
      story={() => []}
      csvExport={snapshot => ({
        filename: 'counts',
        tables: [
          { name: 'Counts', columns: ['Count'], rows: [[snapshot.data]] },
        ],
      })}
    >
      {value => (
        <DataWidget title="Revenue" annotationId="revenue">
          <p>{value}</p>
        </DataWidget>
      )}
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({
  config: {
    title: 'Displayed context',
    scope: { organization: 'test', environment: 'prod' },
    appearance: { theme: 'system' },
  },
  component: App,
});
