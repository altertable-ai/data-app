import { createDataContext } from '@altertable/data-app-react';

import { dataApp } from '#config';

const queryNames = {
  sampleCountsByGroup: 'sampleCountsByGroup',
  sampleCountsBySegment: 'sampleCountsBySegment',
} as const satisfies Record<string, keyof typeof dataApp.queries>;
export const sampleDataContext = createDataContext(queryNames)({
  description:
    'The starter_sample_counts semantic view measures fictional sample volume by group and segment. The source has no time dimension.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition:
        'Sum of recorded sample counts in the selected group scope. Additive across groups and segments.',
      queryNames: [
        queryNames.sampleCountsByGroup,
        queryNames.sampleCountsBySegment,
      ],
    },
  },
});
