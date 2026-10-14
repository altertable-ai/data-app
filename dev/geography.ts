import { hierarchyVariable } from '@altertable/data-app/contract';
import { countries } from '@/dev/commerce';
export function regionForCountry(country: string) {
  return country === 'US' ? 'North America' : 'Europe';
}
export const geography = hierarchyVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      groupLabel: 'Regions',
      valueType: 'string',
      options: [
        { value: 'Europe', label: 'Europe' },
        { value: 'North America', label: 'North America' },
      ],
    },
    {
      id: 'country',
      label: 'Country',
      groupLabel: 'Countries',
      valueType: 'string',
      options: countries.map(country => ({
        ...country,
        parent: regionForCountry(country.value),
      })),
    },
    {
      id: 'customer',
      label: 'Customer',
      groupLabel: 'Customers',
      valueType: 'number',
      options: [
        ...Array.from({ length: 120 }, (_, index) => ({
          value: index + 1,
          label: `Customer ${String(index + 1).padStart(3, '0')}`,
          parent: ['US', 'US', 'FR', 'GB', 'AT'][index % 5]!,
        })),
        { value: 121, label: 'Linus', parent: 'FI' },
      ],
    },
  ],
});
