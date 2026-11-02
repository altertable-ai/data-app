import { createDataContext, createDataHooks } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  dateTimeRangeVariable,
  defineDateRangeContract,
  type DataOperation,
  type DateTimeRange,
} from '@altertable/data-app/contract';

const period = dateTimeRangeVariable({
  key: 'period',
  defaultValue: 'yesterday',
  contract: defineDateRangeContract({ maxRangeDays: 90, timeZone: 'UTC' }),
});
const hooks =
  createDataHooks(
    createDataClient<{
      events: DataOperation<{ period: DateTimeRange }, number>;
      nested: DataOperation<{ filters: { period: DateTimeRange } }, number>;
    }>()
  );
const feedback = {
  dataContext: createDataContext({ events: 'events' })({
    description: 'Events',
    glossary: { count: { term: 'Count', definition: 'Event count' } },
  }),
  isEmpty: () => false,
  emptyFallback: { title: 'No events' },
};
hooks.defineTimeView({ ...feedback, operation: 'events', time: period });
hooks.defineTimeView({
  ...feedback,
  operation: 'nested',
  time: period,
  input: values => ({ filters: { period: values.period } }),
  bindings: { period: input => input.filters.period },
});
// @ts-expect-error Nested inputs need an explicit mapping and period reader.
hooks.defineTimeView({ ...feedback, operation: 'nested', time: period });
const shadowed = {
  ...feedback,
  operation: 'events' as const,
  time: period,
  variables: { period },
};
// @ts-expect-error The selected period cannot be shadowed by an extra variable.
hooks.defineTimeView(shadowed);

const compared = dateTimeRangeVariable({
  key: 'period',
  defaultValue: 'yesterday',
  comparison: true,
  contract: defineDateRangeContract({ maxRangeDays: 90, timeZone: 'UTC' }),
});
const comparisonHooks =
  createDataHooks(
    createDataClient<{
      events: DataOperation<
        { period: ReturnType<typeof compared.input> },
        number
      >;
      nested: DataOperation<
        { filters: { period: ReturnType<typeof compared.input> } },
        number
      >;
    }>()
  );
const comparedView = comparisonHooks.defineTimeView({
  ...feedback,
  operation: 'events',
  time: compared,
});
comparedView.metric(
  {
    id: 'count',
    glossaryId: 'count',
    queryNames: ['events'],
    format: { kind: 'count' },
  },
  count => ({ current: count, previous: 1 })
);
comparisonHooks.defineTimeView({
  ...feedback,
  operation: 'nested',
  time: compared,
  input: values => ({ filters: { period: values.period } }),
  bindings: { period: input => input.filters.period },
});
const missingReader = {
  ...feedback,
  operation: 'nested' as const,
  time: compared,
  input: (values: { period: ReturnType<typeof compared.input> }) => ({
    filters: values,
  }),
};
// @ts-expect-error Nested datetime comparison inputs require a period binding.
comparisonHooks.defineTimeView(missingReader);
// @ts-expect-error Comparison policy is required when enabling the reporting workflow.
dateTimeRangeVariable({ key: 'period', defaultValue: '7d', comparison: true });
