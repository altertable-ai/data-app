import { createDataContext } from '@altertable/data-app-react';

import { operations } from '#app/operations.ts';

const queryNames = {
  ...operations.costBreakdown.queryNames,
  ...operations.totalCost.queryNames,
  ...operations.costsByCustomer.queryNames,
  ...operations.costTrend.queryNames,
  ...operations.customerServiceMix.queryNames,
};
// Illustrative definitions and coverage; verify them against the real source.
export const costDataContext = createDataContext(queryNames)({
  description:
    'Fictional weekly customer allocations for August and September 2026. Scope filters apply to every chart and its contributing records.',
  glossary: {
    allocatedCost: {
      term: 'Allocated cost',
      definition:
        'USD charges in the selected billing month and customer scope. Four recorded allocation batches, dated the 1st, 8th, 15th and 22nd, sum to each monthly allocation. Customers sum to services; services sum to the total. Zero is a recorded charge of zero.',
      queryNames: Object.values(queryNames),
    },
    customerCount: {
      term: 'Customers',
      definition:
        'Distinct customers with recorded allocations in the selected scope, including recorded zero charges.',
      queryNames: [queryNames.totalCost],
    },
    averageCustomerCost: {
      term: 'Average per customer',
      definition:
        'Total allocated cost divided by the number of distinct customers in the same selected scope, including customers with zero charges.',
      queryNames: [queryNames.totalCost],
    },
  },
});
