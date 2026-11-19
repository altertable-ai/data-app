import { choiceFilter } from '@altertable/data-app/contract';

// Share these browser-safe declarations between operations and their controls.
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
