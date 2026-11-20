import { choiceFilter } from '@altertable/data-app/contract';

// The options match the fictional rows; the query treats 'all' as every group.
export const groupName = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All groups' },
    { id: 'Alpha', label: 'Alpha' },
    { id: 'Beta', label: 'Beta' },
    { id: 'Gamma', label: 'Gamma' },
  ],
});
