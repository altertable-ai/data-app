import { createDataContext } from '@altertable/data-app-react';
const queryNames = { sampleCountsByGroup: 'sampleCountsByGroup' } as const;
export const sampleDataContext = createDataContext(queryNames)({
  description:
    'Two SQL VALUES rows demonstrate the host query path. Replace them with inspected source data before publishing findings.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition:
        'A fixture value: Alpha is 2,200,000 and Beta is a measured zero.',
      queryNames: [queryNames.sampleCountsByGroup],
    },
  },
});
