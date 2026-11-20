import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  VisualizationWidget,
  mountDataApp,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import {
  BarChart,
  LiveControl,
  SegmentedControl,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  type LiveIntervalSeconds,
} from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import { useState } from 'react';

import { literalLakehouse } from '@/tests/public-api/fixtures/literal-client';

const dataApp = defineDataApp({
  title: 'Focus rings',
  description: 'Keyboard focus on controls inside clipping containers.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
const operations = {
  weeklyActivity: dataApp.defineOperation({
    policy: { maxQueryRows: 10 },
    async run() {
      return [
        { id: 'mon', label: 'Monday', value: 12 },
        { id: 'tue', label: 'Tuesday', value: 0 },
        { id: 'wed', label: 'Wednesday', value: 8 },
      ];
    },
  }),
};
const dataContext = createDataContext({})({
  description: 'Weekly activity.',
  glossary: { events: { term: 'Events', definition: 'Recorded events.' } },
});
const { defineView } = createDataHooks(
  createDataClient({ operations, lakehouse: literalLakehouse })
);
const activityView = defineView({
  dataContext,
  operation: 'weeklyActivity',
  emptyFallback: { title: 'No activity' },
});
const days = activityView.dataset({
  name: 'Weekly activity',
  rowKey: row => row.id,
  columns: { label: { label: 'Day' }, value: { label: 'Events' } },
  evidence: { id: 'weekly-activity', glossaryIds: ['events'] },
});
const activityContent = activityView.content(result => (
  <VisualizationWidget
    dataset={days}
    source={result}
    title="Weekly activity"
    viewLabel="Activity presentation"
    views={[
      {
        id: 'chart',
        label: 'Chart',
        render: items => (
          <BarChart
            items={[...items]}
            unit="events"
            ariaLabel="Weekly events"
          />
        ),
      },
      { id: 'summary', label: 'Summary', render: () => <p>20 events</p> },
    ]}
  />
));

function App() {
  const [live, setLive] = useState(false);
  const [interval, setInterval] = useState<LiveIntervalSeconds>(60);
  const [grouping, setGrouping] = useState('daily');
  return (
    <main>
      <Tabs>
        <TabList aria-label="Sections">
          <Tab id="first">First</Tab>
          <Tab id="second">Second</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="first">First panel</TabPanel>
          <TabPanel id="second">Second panel</TabPanel>
        </TabPanels>
      </Tabs>
      <LiveControl
        enabled={live}
        onChange={setLive}
        intervalSeconds={interval}
        onIntervalChange={setInterval}
      />
      <SegmentedControl
        label="Grouping"
        options={[
          { id: 'daily', label: 'Daily' },
          { id: 'weekly', label: 'Weekly' },
        ]}
        value={grouping}
        onChange={setGrouping}
      />
      <DataApp view={activityView}>
        <DataSection content={activityContent} />
      </DataApp>
    </main>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });
