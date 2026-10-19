import { defineDataIdentifiers } from '@altertable/data-app/react';

const orders = { catalog: 'memory', schema: 'demo', name: 'orders' };
const { DataIdentifier } = defineDataIdentifiers({
  tables: { orders },
  columns: { amount: { table: 'orders', name: 'amount' } },
});
<DataIdentifier id="tables.orders" />;
<DataIdentifier id="columns.orders.amount" />;
// @ts-expect-error JSX IDs name registered identifiers.
<DataIdentifier id="tables.missing" />;

defineDataIdentifiers({
  tables: { orders },
  // @ts-expect-error Columns belong to a registered table.
  columns: { amount: { table: 'missing', name: 'amount' } },
});
defineDataIdentifiers({
  // @ts-expect-error Table aliases cannot contain dots.
  tables: { 'demo.orders': orders },
  columns: {},
});
defineDataIdentifiers({
  // @ts-expect-error Table aliases cannot be blank.
  tables: { '': orders },
  columns: {},
});
defineDataIdentifiers({
  tables: { orders },
  // @ts-expect-error Column aliases cannot contain dots.
  columns: { 'orders.amount': { table: 'orders', name: 'amount' } },
});
