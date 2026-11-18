import { choiceFilter } from '@altertable/data-app/contract';

export const groupName = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All groups' },
    { id: 'Alpha', label: 'Alpha' },
    { id: 'Gamma', label: 'Gamma' },
    { id: 'Delta', label: 'Delta' },
    { id: 'Beta', label: 'Beta' },
  ],
});
