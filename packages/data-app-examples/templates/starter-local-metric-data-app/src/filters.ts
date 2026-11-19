import { choiceFilter } from '@altertable/data-app/contract';

// Reuse this group filter in both operations so one selection updates both charts.
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

export const operationFilters = {
  sampleCountsByGroup: { groupName },
  sampleCountsBySegment: { groupName },
};
