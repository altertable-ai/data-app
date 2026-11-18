import { createDataContext } from '@altertable/data-app-react';

import { operations } from '#app/operations.ts';

const queryNames = {
  ...operations.sampleCountsByGroup.queryNames,
  ...operations.sampleCountsBySegment.queryNames,
};
export const sampleDataContext = createDataContext(queryNames)({
  description:
    'The starter_sample_counts semantic view measures fictional samples by group and segment. Replace it with the requested semantic metric before publishing.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'A fixture value: Alpha is 2,200,000 and Beta is 600,000.',
      queryNames: [
        queryNames.sampleCountsByGroup,
        queryNames.sampleCountsBySegment,
      ],
    },
  },
});
