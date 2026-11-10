import { defineDataApp } from '@altertable/data-app';
import { createDataContext, createDataHooks } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  dateTimeRangeFilter,
  type DateTimeRangeInput,
} from '@altertable/data-app/contract';

const period = dateTimeRangeFilter({
  key: 'period',
  defaultValue: 'yesterday',
  maxRangeDays: 90,
  timeZone: 'UTC',
});
const comparedPeriod = dateTimeRangeFilter({
  key: 'compared',
  defaultValue: 'yesterday',
  comparison: 'off',
  maxRangeDays: 90,
  timeZone: 'UTC',
});
const app = defineDataApp({
  title: 'Datetime views',
  description: 'Datetime filters set the reporting period.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    events: {
      statement: 'SELECT 1 AS count',
      params: {},
      projections: { count: { type: 'number' } },
    },
  },
});
const policy = { maxQueryRows: 1, maxDurationMs: 1000 };
const operations = {
  events: app.defineOperation({
    filters: { period },
    policy,
    async run(_context, input) {
      const { range, comparison } = input.period;
      const bounds: { from: Date; to: Date } = range;
      void [bounds, comparison];
      return 1;
    },
  }),
  comparedEvents: app.defineOperation({
    filters: { comparedPeriod },
    policy,
    async run(_context, input) {
      const request: DateTimeRangeInput = input.comparedPeriod;
      void request;
      return 1;
    },
  }),
};
const hooks = createDataHooks(createDataClient({ operations }));
const dataContext = createDataContext({ events: 'events' })({
  description: 'Events',
  glossary: { count: { term: 'Count', definition: 'Event count' } },
});
const count = {
  id: 'count',
  glossaryId: 'count',
  queryNames: ['events'],
  format: { kind: 'count' },
} as const;

const events = hooks.defineView({ dataContext, operation: 'events' });
events.metric(count, data => ({ current: data }));
// @ts-expect-error A datetime range without comparison has no previous value.
events.metric(count, data => ({ current: data, previous: 1 }));

const comparedEvents = hooks.defineView({
  dataContext,
  operation: 'comparedEvents',
});
comparedEvents.metric(count, data => ({ current: data, previous: 1 }));

dateTimeRangeFilter({
  key: 'period',
  defaultValue: '7d',
  // @ts-expect-error The comparison toggle starts off or on.
  comparison: 'previous',
});
