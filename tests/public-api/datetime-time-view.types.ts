import { createDataContext, createDataHooks } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  dateTimeRangeFilter,
  defineDateRangeContract,
  type DataOperation,
  type DateTimeRange,
} from '@altertable/data-app/contract';

const period = dateTimeRangeFilter({
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
};
const filters = hooks.defineFilters({ period });
hooks.defineTimeView({ ...feedback, operation: 'events', filters });
hooks.defineTimeView({
  ...feedback,
  operation: 'nested',
  filters,
  input: values => ({ filters: { period: values.period } }),
  bindings: { period: input => input.filters.period },
});
// @ts-expect-error Nested inputs need an explicit mapping and period reader.
hooks.defineTimeView({ ...feedback, operation: 'nested', filters });

const compared = dateTimeRangeFilter({
  key: 'period',
  defaultValue: 'yesterday',
  allowComparison: true,
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
const comparedFilters = comparisonHooks.defineFilters({ period: compared });
const comparedView = comparisonHooks.defineTimeView({
  ...feedback,
  operation: 'events',
  filters: comparedFilters,
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
  filters: comparedFilters,
  input: values => ({ filters: { period: values.period } }),
  bindings: { period: input => input.filters.period },
});
const missingReader = {
  ...feedback,
  operation: 'nested' as const,
  filters: comparedFilters,
  input: (values: { period: ReturnType<typeof compared.input> }) => ({
    filters: values,
  }),
};
// @ts-expect-error Nested datetime comparison inputs require a period binding.
comparisonHooks.defineTimeView(missingReader);
dateTimeRangeFilter({
  key: 'period',
  defaultValue: '7d',
  // @ts-expect-error Comparison policy is required when enabling the reporting workflow.
  allowComparison: true,
});
