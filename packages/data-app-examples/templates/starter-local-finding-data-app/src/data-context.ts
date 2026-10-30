import { createDataContext } from '@altertable/data-app-react';
const queryNames = { sampleCountsByGroup: 'sampleCountsByGroup' } as const;
export const sampleDataContext = createDataContext(queryNames)({
  description:
    'Fictional sample volumes grouped from starter_demo.sample_counts. Replace this evidence with the actual Finding queries.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'A fixture value: Alpha is 2,200,000 and Beta is 600,000.',
      queryNames: [queryNames.sampleCountsByGroup],
    },
  },
});
