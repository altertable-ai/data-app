import { defineDataApp } from '@altertable/data-app';
import {
  dateTimeRangeVariable,
  dateTimeRangePresets,
  DateTimeRangePicker,
  Button,
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  mountDataApp,
  injectDataAppStyles,
  useDateFormatting,
} from '@altertable/data-app-react';
import { DateRangePicker, type DateRange } from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import {
  type DateTimeRange,
  defineDateRangeContract,
  variableInput,
} from '@altertable/data-app/contract';
import { useState } from 'react';

const app = defineDataApp({
  title: 'Datetime exploration',
  description: 'Explore a datetime range.',
  dateFormatting: {
    locale: new URLSearchParams(location.search).get('locale') ?? 'en-US',
  },
  scope: { organization: 'test', environment: 'test' },
  queries: {
    events: {
      statement: 'SELECT $period.from AS start, $period.to AS end',
      params: { period: { type: 'dateTimeRange' } },
      projections: { selection: { type: 'string' } },
    },
  },
});
const presetMenu = new URLSearchParams(location.search).get('presets');
const contract = new URLSearchParams(location.search).has('policy')
  ? defineDateRangeContract({
      minDate: '2026-06-01',
      maxDate: '2026-07-01',
      maxRangeDays: 7,
      timeZone:
        new URLSearchParams(location.search).get('reportingZone') ?? 'UTC',
    })
  : undefined;
const presets =
  presetMenu === 'analytics'
    ? [
        ...dateTimeRangePresets.analytics,
        {
          label: 'Launch window',
          range: {
            from: new Date('2026-01-01T00:00:00.000Z'),
            to: new Date('2026-01-03T00:00:00.000Z'),
          },
        },
      ]
    : presetMenu === 'monitoring'
      ? dateTimeRangePresets.monitoring
      : presetMenu === 'empty'
        ? []
        : undefined;
const period = dateTimeRangeVariable({
  key: 'period',
  defaultValue: contract
    ? {
        from: new Date('2026-06-28T00:00:00Z'),
        to: new Date('2026-07-02T00:00:00Z'),
      }
    : '7d',
  contract,
  presets,
});
const events = app.defineOperation({
  input: variableInput(() => ({}), { period }),
  checks: [{ period: period.defaultValue }],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run({ query }, input) {
    return (await query('events', input)).rows;
  },
});
const client = createDataClient({
  operations: { events },
  lakehouse: {
    async queryAll(statement, { params }) {
      if (
        statement.includes('$period.from') ||
        !statement.includes('WITH RECURSIVE')
      )
        throw new Error('Range not compiled');
      return { columns: [{ name: 'selection' }], rows: [[params?.period]] };
    },
  },
});
const view = createDataHooks(client).defineTimeView({
  dataContext: createDataContext(events.queryNames)({
    description: 'Datetime results',
    glossary: {},
  }),
  operation: 'events',
  time: period,
  isEmpty: () => false,
  emptyFallback: { title: 'No events' },
});
const dataset = view.dataset({
  name: 'Selection',
  select: rows => rows,
  rowKey: () => 'selection',
  columns: { selection: { value: row => row.selection } },
  evidence: { id: 'selection', queryNames: ['events'] },
});
const content = view.content(source => (
  <TextWidget title="Selection" source={source} dataset={dataset}>
    {rows => <output aria-label="Applied period">{rows[0]?.selection}</output>}
  </TextWidget>
));
function App() {
  if (new URLSearchParams(location.search).has('calendarControls'))
    return <CalendarControls />;
  if (new URLSearchParams(location.search).has('controls'))
    return <PickerControls />;
  return (
    <DataApp view={view} datasets={[dataset]} story={() => []}>
      <DataSection content={content} />
      <ReportingZone />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });

function PickerControls() {
  const [value, setValue] = useState<DateTimeRange | null>(null);
  const [live, setLive] = useState(false);
  return (
    <main
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <DateTimeRangePicker
        label="Custom period"
        presets={presets}
        value={value}
        maxRangeDays={3}
        liveOption={{
          dateTimeRange: {
            from: {
              anchor: 'RELATIVE_ANCHOR_NOW',
              offset: [{ amount: -15, unit: 'MINUTE' }],
            },
            to: null,
          },
          isLive: live,
        }}
        onChange={(next, isLive) => {
          setValue(next);
          setLive(isLive ?? false);
        }}
      />
      <Button
        onClick={() => {
          setValue(null);
          setLive(false);
        }}
      >
        Clear selection
      </Button>
      <output aria-label="Custom selection">
        {JSON.stringify({ value, live })}
      </output>
    </main>
  );
}

function ReportingZone() {
  const { timeZone } = useDateFormatting();
  return <output aria-label="Reporting timezone">{timeZone}</output>;
}

function CalendarControls() {
  const options = new URLSearchParams(location.search);
  const [readOnly, setReadOnly] = useState(options.has('readOnly'));
  const [value, setValue] = useState<DateRange | null>({
    start: '2027-03-04',
    end: '2027-03-06',
  });
  return (
    <main>
      <DateRangePicker
        label="Calendar period"
        isReadOnly={readOnly}
        isDisabled={options.has('disabled')}
        className={state =>
          state.isReadOnly
            ? 'readonly-calendar'
            : state.isOpen
              ? 'open-calendar'
              : 'editable-calendar'
        }
        style={state => ({ width: state.isOpen ? 420 : 360 })}
        validate={
          options.has('validate')
            ? range => (range.start.day === 10 ? 'Blocked by host' : null)
            : undefined
        }
        isDateUnavailable={
          options.has('unavailable') ? date => date.day === 11 : undefined
        }
        value={value}
        onChange={setValue}
        maxDate={
          new URLSearchParams(location.search).has('bounded')
            ? '2027-03-31'
            : undefined
        }
      />
      <Button onClick={() => setReadOnly(value => !value)}>
        Toggle read only
      </Button>
      <output aria-label="Calendar selection">{JSON.stringify(value)}</output>
    </main>
  );
}
