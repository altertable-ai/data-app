import { createDataContext } from '@altertable/data-app-react';

import { dataApp } from '#config';

const queryNames = {
  sampleCountsByGroup: 'sampleCountsByGroup',
  sampleTotal: 'sampleTotal',
} as const satisfies Record<string, keyof typeof dataApp.queries>;
export const sampleDataContext = createDataContext(queryNames)({
  description:
    'Fictional recorded sample counts for four groups, including a measured zero.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition:
        'Number of recorded samples. Totals sum the groups in the selected scope; zero denotes a measured count.',
      queryNames: [queryNames.sampleCountsByGroup, queryNames.sampleTotal],
    },
  },
});
