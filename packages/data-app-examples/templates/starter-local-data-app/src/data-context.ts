import { createDataContext } from '@altertable/data-app-react';

import { dataApp } from '#config';

// Replace the description and definitions with verified source metadata.
export const dataContext = createDataContext(dataApp.queryNames)({
  description:
    'Fictional sample counts by group. Gamma has a recorded count of zero.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition:
        'Sum of recorded samples in the selected group scope. Additive across groups.',
      queryNames: [dataApp.queryNames.sampleCountsByGroup],
    },
  },
});
