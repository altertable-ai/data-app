import { createDataContext } from '@altertable/data-app-react';
const queryNames = {
  sampleCountsByGroup: 'sampleCountsByGroup',
  sampleCountsBySegment: 'sampleCountsBySegment',
} as const;
export const sampleDataContext = createDataContext(queryNames)({
  description:
    'SQL VALUES demonstrate group and segment breakdowns. Replace them with inspected source data before publishing findings.',
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
