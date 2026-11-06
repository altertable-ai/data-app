import { createDataContext } from '@altertable/data-app-react';
const queryNames = { samples: 'samples' } as const;
export const sampleDataContext = createDataContext(queryNames)({
  description:
    'Fictional daily samples from starter_demo.daily_samples. Replace this evidence with the actual Finding queries.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'Fixture samples recorded per day, group, and segment.',
      queryNames: [queryNames.samples],
    },
  },
});
