import { defineDataApp } from '@altertable/data-app';
import { mountDataApp, injectDataAppStyles } from '@altertable/data-app-react';
import {
  BarChart,
  LiveControl,
  SegmentedControl,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VisualizationWidget,
  type LiveIntervalSeconds,
} from '@altertable/data-app-react/ui';
import { useState } from 'react';

const dataApp = defineDataApp({
  title: 'Focus rings',
  description: 'Keyboard focus on controls inside clipping containers.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
const days = [
  { id: 'mon', label: 'Monday', value: 12 },
  { id: 'tue', label: 'Tuesday', value: 0 },
  { id: 'wed', label: 'Wednesday', value: 8 },
];

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
      <VisualizationWidget
        title="Weekly activity"
        reading={{ loading: false, value: days }}
        isEmpty={items => items.length === 0}
        emptyFallback={{ title: 'No activity' }}
        evidence={{ id: 'weekly-activity', queryNames: ['weekly-activity'] }}
        viewLabel="Activity presentation"
        views={[
          {
            id: 'chart',
            label: 'Chart',
            render: items => (
              <BarChart items={items} unit="events" ariaLabel="Weekly events" />
            ),
          },
          { id: 'summary', label: 'Summary', render: () => <p>20 events</p> },
        ]}
      />
    </main>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });
