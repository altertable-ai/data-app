import { choiceFilter } from '@altertable/data-app/contract';

// Declare each filter once in this browser-safe module: operations read them on
// the server, and the browser client renders their controls.
const groupName = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All groups' },
    { id: 'Alpha', label: 'Alpha' },
    { id: 'Beta', label: 'Beta' },
  ],
});

/** The filters each operation reads. */
export const operationFilters = {
  sampleCountsByGroup: { groupName },
  sampleCountsBySegment: { groupName },
};
