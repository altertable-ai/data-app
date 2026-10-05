import {
  defineQueryVariables,
  type QueryVariableValues,
} from '@altertable/data-app/contract';
import {
  queryVariable,
  type AppVariableValues,
} from '@altertable/data-app/react';
const definitions = defineQueryVariables([
  { name: 'count', nullable: false, type: 'INTEGER', default: 1 },
  { name: 'interval', nullable: false, type: 'INTERVAL', default: 'DAILY' },
  { name: 'text', type: 'STRING', default: null, nullable: true },
]);
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
defineQueryVariables([
  // @ts-expect-error unsupported variable type
  { name: 'name', nullable: false, default: '', type: 'SQL' },
]);
defineQueryVariables([
  // @ts-expect-error interval options must use the frontend enum
  { name: 'interval', nullable: false, type: 'INTERVAL', default: 'day' },
]);
const controls = { count: queryVariable(definitions[0], { key: 'count' }) };
const controlled: AppVariableValues<typeof controls> = { count: 3 };
void controlled;
// @ts-expect-error generated selectors retain their value type
const invalidControl: AppVariableValues<typeof controls> = { count: false };
void invalidControl;
