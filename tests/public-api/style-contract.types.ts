import type {
  DataAppStyle,
  DataAppStyleHooks,
} from '@altertable/data-app/react';

const style = {
  padding: '8px',
  '--atbl-control-height': '40px',
  '--atbl-control-text-size': '18px',
} satisfies DataAppStyle;
const hooks = {
  'data-atbl-focus': 'ring',
  'data-atbl-control': 'action',
} satisfies DataAppStyleHooks;
const privateToken = {
  // @ts-expect-error Private brand inputs are not public tokens.
  '--atbl-input-accent': '#123456',
} satisfies DataAppStyle;
const unknownToken = {
  // @ts-expect-error Invented token names are rejected.
  '--atbl-button-color': '#123456',
} satisfies DataAppStyle;
const unknownFocus = {
  // @ts-expect-error Focus treatments are constrained.
  'data-atbl-focus': 'always',
} satisfies DataAppStyleHooks;
void [style, hooks, privateToken, unknownToken, unknownFocus];
