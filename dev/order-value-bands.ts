export const orderValueBands = [
  { id: 'under-100', label: 'Under $100', min: 0, max: 100 },
  { id: '100-to-250', label: '$100–250', min: 100, max: 250 },
  { id: '250-to-500', label: '$250–500', min: 250, max: 500 },
  { id: '500-and-over', label: '$500 and over', min: 500, max: null },
] as const;
export type OrderValueBandId = (typeof orderValueBands)[number]['id'];

export function orderValueBand(value: unknown) {
  const band = orderValueBands.find(band => band.id === value);
  if (!band) throw new Error('Expected a declared order value band.');
  return band;
}
