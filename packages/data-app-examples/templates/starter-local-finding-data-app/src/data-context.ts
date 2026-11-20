import { createDataContext } from '@altertable/data-app-react';

import { dataApp } from '#config';

export const sampleDataContext = createDataContext(dataApp.queryNames)({
  description:
    'Fictional daily sample counts by group and segment. Comparisons use equal-length periods in UTC.',
  glossary: {
    sampleChange: {
      term: 'Sample change',
      definition:
        'Selected-period samples minus the previous equal-length period in the same scope. Missing observations remain unavailable; they are not measured zeroes.',
      queryNames: ['samplesByMember'],
    },
    sampleCount: {
      term: 'Sample count',
      definition:
        'Number of samples recorded for each day, group, and segment.',
      queryNames: Object.values(dataApp.queryNames),
    },
  },
});
