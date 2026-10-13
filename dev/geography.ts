import {
  breakdownVariable,
  dimensionFilter,
} from '@altertable/data-app/contract';
export const geography = breakdownVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    { id: 'region', label: 'Regions' },
    { id: 'country', label: 'Countries' },
    { id: 'customer', label: 'Customers' },
  ],
});
export const regionFilter = dimensionFilter<string>({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  options: [
    { value: 'Europe', label: 'Europe' },
    { value: 'North America', label: 'North America' },
  ],
});
export function regionForCountry(country: string) {
  return country === 'US' ? 'North America' : 'Europe';
}
