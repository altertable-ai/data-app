import { defineDataAppConfig } from '@altertable/data-app/config';
import { useState } from 'react';
import {
  mountDataApp,
  injectDataAppStyles,
  Button,
} from '@altertable/data-app/react';
import {
  DataApp,
  DataWidget,
  MetricWidget,
  AboutData,
} from '@altertable/data-app/react/ui';
const DATA_APP_CONFIG = defineDataAppConfig({
  title: 'Inspection ownership',
  scope: { organization: 'Test', environment: 'local' },
  appearance: {},
  queries: {},
});
const evidence: import('@altertable/data-app/react').WidgetEvidence = {
  id: 'shared',
  queryNames: ['counts'],
};
function ControlledInspection() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(0);
  return (
    <>
      <p data-testid="inspection-requests">{requests}</p>
      <Button onClick={() => setOpen(true)}>Accept open</Button>
      <AboutData
        id="controlled"
        title="Controlled"
        open={open}
        onOpenChange={() => setRequests(value => value + 1)}
        shortcut={false}
        headerActions={
          <Button onClick={() => setOpen(false)}>Accept close</Button>
        }
      >
        Controlled inspection
      </AboutData>
    </>
  );
}
function App() {
  const [count, setCount] = useState(1);
  return (
    <DataApp
      config={DATA_APP_CONFIG}
      dataContext={{ description: 'Counts', glossary: {} }}
      queries={[{ name: 'counts', statement: 'SELECT 1 AS count' }]}
    >
      {new URLSearchParams(location.search).has('controlled') && (
        <ControlledInspection />
      )}
      <Button onClick={() => setCount(value => value + 1)}>
        Update result
      </Button>
      <DataWidget title="Summary" evidence={evidence}>
        <MetricWidget
          label="Nested count"
          value={count}
          format={{ kind: 'count' }}
          evidence={evidence}
        />
      </DataWidget>
      <MetricWidget
        label="Repeated count"
        value={count}
        format={{ kind: 'count' }}
        evidence={evidence}
      />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: DATA_APP_CONFIG, component: App });
