import { createDataContext } from '@altertable/data-app-react';

import { dataApp } from '#config';

const queryNames = {
  costsByService: 'costsByService',
  totalCost: 'totalCost',
  costsByCustomer: 'costsByCustomer',
} as const satisfies Record<string, keyof typeof dataApp.queries>;
export const costDataContext = createDataContext(queryNames)({
  description:
    'Fictional customer allocations for September 2026, covering all four services and all three customers in this demo.',
  glossary: {
    allocatedCost: {
      term: 'Allocated cost',
      definition:
        'Infrastructure charges allocated to customers for September 2026, in USD. Customer allocations sum to each service; services sum to the total. Zero is a recorded charge of zero.',
      queryNames: [
        queryNames.costsByService,
        queryNames.totalCost,
        queryNames.costsByCustomer,
      ],
    },
  },
});
