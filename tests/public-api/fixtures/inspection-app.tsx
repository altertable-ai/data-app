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
const config = {
  title: 'Inspection ownership',
  scope: { organization: 'Test', environment: 'local' },
  appearance: {},
};
const evidence: import('@altertable/data-app/react').WidgetEvidence = {
  id: 'shared',
  queryNames: ['counts'],
};
function ControlledInspection() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<boolean[]>([]);
  return (
    <>
      <output aria-label="Inspection requests">
        {JSON.stringify(requests)}
      </output>
      <Button onClick={() => setOpen(true)}>Accept open</Button>
      <AboutData
        id="controlled"
        title="Controlled"
        open={open}
        onOpenChange={requested =>
          setRequests(previous => [...previous, requested])
        }
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
      config={config}
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
mountDataApp({ config, component: App });
