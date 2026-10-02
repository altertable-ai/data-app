import {
  defineQueryVariables,
  type QueryVariableValues,
} from '@altertable/data-app/contract';
import {
  queryVariable,
  type AppVariableValues,
} from '@altertable/data-app/react';
const definitions = defineQueryVariables({
  count: { type: 'INTEGER', default: 1 },
  interval: { type: 'INTERVAL', default: 'DAILY' },
  text: { type: 'STRING', default: null, nullable: true },
});
const values: QueryVariableValues<typeof definitions> = {
  count: 4,
  interval: 'MONTHLY',
  text: null,
};
void values;
const invalid: QueryVariableValues<typeof definitions> = {
  // @ts-expect-error integer values cannot be strings
  count: '4',
  interval: 'DAILY',
  text: null,
};
void invalid;
// @ts-expect-error unsupported variable type
defineQueryVariables({ name: { type: 'SQL' } });
// @ts-expect-error interval options must use the frontend enum
defineQueryVariables({ interval: { type: 'INTERVAL', default: 'day' } });
const controls = { count: queryVariable(definitions.count, { key: 'count' }) };
const controlled: AppVariableValues<typeof controls> = { count: 3 };
void controlled;
// @ts-expect-error generated selectors retain their value type
const invalidControl: AppVariableValues<typeof controls> = { count: false };
void invalidControl;
