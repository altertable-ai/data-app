import { createDataContext } from '@altertable/data-app-react';

import { operations } from '#app/operations.ts';

const queryNames = {
  ...operations.sampleTotal.queryNames,
  ...operations.samplesOverTime.queryNames,
  ...operations.samplesByMember.queryNames,
  ...operations.sampleRows.queryNames,
};
export const sampleDataContext = createDataContext(queryNames)({
  description:
    'Fictional daily samples from starter_demo.daily_samples. Replace this evidence with the actual Finding queries.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'Fixture samples recorded per day, group, and segment.',
      queryNames: Object.values(queryNames),
    },
  },
});
