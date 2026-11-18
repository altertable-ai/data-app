import { choiceFilter, displayChoice } from '@altertable/data-app/contract';

// Demo periods: replace with the billing months available in the source.
export const month = choiceFilter({
  key: 'month',
  label: 'Month',
  defaultValue: '2026-09',
  options: [
    { id: '2026-09', label: 'September 2026' },
    { id: '2026-08', label: 'August 2026' },
  ],
});
// Demo customers: replace with source-backed customer choices.
export const customer = choiceFilter({
  key: 'customer',
  label: 'Customer',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All customers' },
    { id: 'Atlas', label: 'Atlas' },
    { id: 'Beacon', label: 'Beacon' },
    { id: 'Cedar', label: 'Cedar' },
  ],
});
export const breakdown = displayChoice({
  key: 'breakdown',
  label: 'Breakdown',
  defaultValue: 'service',
  options: [
    { id: 'service', label: 'Service' },
    { id: 'customer', label: 'Customer' },
  ],
});
