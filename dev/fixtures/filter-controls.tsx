import { NumberFilterControl } from '@/src/react/ui/NumberFilterControl';
import { useState } from 'react';
import { Stack } from '@altertable/data-app/react';
import {
  dimensionFilter,
  numberFilter,
  booleanFilter,
  type NumberSelection,
  type BooleanSelection,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  ActiveFilters,
  Checkbox,
  CheckboxGroup,
  ChoicePicker,
  DimensionPicker,
  FilterActions,
  FilterBar,
  Menu,
  MenuButton,
  MenuItem,
  MenuPopover,
  MenuSeparator,
  MenuTrigger,
  NumberField,
  NumberRangeField,
  Radio,
  RadioGroup,
  SearchField,
  SegmentedControl,
  Select,
  type NumberRange,
} from '@altertable/data-app/react/ui';

const options = [
  { id: 'orders', label: 'Orders' },
  { id: 'revenue', label: 'Revenue' },
];
const countryFilter = dimensionFilter<string>({
  key: 'gallery-country',
  label: 'Country',
  valueType: 'string',
  selectionMode: 'multiple',
  allowMissing: true,
  allowExclusion: true,
  options: [
    { value: 'AT', label: 'Austria' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'US', label: 'United States' },
  ],
});

const amountFilter = numberFilter({
  key: 'gallery-amount',
  label: 'Order amount',
  min: 0,
});
const activeFilter = booleanFilter({ key: 'gallery-active', label: 'Active' });

/** Local controlled examples: every callback updates the visible value directly. */
export function FilterControlsPreview() {
  const [search, setSearch] = useState('');
  const [metric, setMetric] = useState('orders');
  const [metrics, setMetrics] = useState<string[]>(['orders']);
  const [period, setPeriod] = useState('daily');
  const [states, setStates] = useState<string[]>(['paid']);
  const [archived, setArchived] = useState(false);
  const [amount, setAmount] = useState<number | null>(0);
  const [range, setRange] = useState<NumberRange>({ min: 10, max: 100 });
  const [country, setCountry] = useState<DimensionSelection<string>>({
    kind: 'include',
    members: [{ kind: 'value', value: 'AT' }],
  });
  const [amountSelection, setAmountSelection] = useState<NumberSelection>({
    kind: 'comparison',
    operator: 'gte',
    value: 20,
  });
  const [activeSelection, setActiveSelection] = useState<BooleanSelection>({
    kind: 'all',
  });
  const [action, setAction] = useState('Choose an action');
  const active =
    country.kind === 'all'
      ? []
      : [
          {
            id: 'country',
            label: `Country: ${countryFilter.describe(country)}`,
            onRemove: () => setCountry({ kind: 'all' }),
          },
        ];
  return (
    <Stack gap="lg">
      <FilterBar aria-label="Search and fixed choices">
        <SearchField
          label="Search records"
          value={search}
          onChange={setSearch}
        />
        <Select
          label="Metric"
          options={options}
          value={metric}
          onChange={setMetric}
        />
        <ChoicePicker
          label="Primary metric"
          selectionMode="single"
          options={options}
          value={metric}
          onChange={setMetric}
        />
        <ChoicePicker
          label="Visible metrics"
          selectionMode="multiple"
          options={options}
          values={metrics}
          onChange={setMetrics}
          maxSelected={2}
          emptySelectionLabel="None"
        />
      </FilterBar>
      <FilterBar aria-label="Exclusive and independent choices">
        <RadioGroup label="Metric" value={metric} onChange={setMetric}>
          <Radio value="orders">Orders</Radio>
          <Radio value="revenue">Revenue</Radio>
        </RadioGroup>
        <SegmentedControl
          label="Group by"
          options={[
            { id: 'daily', label: 'Daily' },
            { id: 'monthly', label: 'Monthly' },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <CheckboxGroup
          label="Payment states"
          values={states}
          onChange={setStates}
        >
          <Checkbox value="paid" label="Paid" />
          <Checkbox value="pending" label="Pending" />
        </CheckboxGroup>
        <Checkbox
          label="Include archived"
          checked={archived}
          onChange={setArchived}
        />
      </FilterBar>
      <FilterBar aria-label="Numeric filters">
        <NumberField
          label="Minimum order value"
          value={amount}
          onChange={setAmount}
        />
        <NumberRangeField
          label="Order value range"
          value={range}
          onChange={setRange}
        />
      </FilterBar>
      <FilterBar aria-label="Numeric and boolean predicates">
        <NumberFilterControl
          filter={amountFilter}
          value={amountSelection}
          onChange={setAmountSelection}
        />
        <Select
          label={activeFilter.label}
          value={
            activeSelection.kind === 'all'
              ? 'all'
              : String(activeSelection.value)
          }
          options={[
            { id: 'all', label: 'Any' },
            { id: 'true', label: 'Yes' },
            { id: 'false', label: 'No' },
          ]}
          onChange={value =>
            setActiveSelection(
              value === 'all'
                ? { kind: 'all' }
                : { kind: 'is', value: value === 'true' }
            )
          }
        />
      </FilterBar>
      <FilterBar aria-label="Categorical filter and clear action">
        <DimensionPicker
          filter={countryFilter}
          value={country}
          onChange={setCountry}
        />
        <ActiveFilters filters={active} />
        <FilterActions onClear={() => setCountry({ kind: 'all' })} />
      </FilterBar>
      <FilterBar aria-label="Draft actions and command menu">
        <FilterActions
          onApply={() => setAction('Filters applied')}
          onCancel={() => setAction('Changes cancelled')}
        />
        <MenuTrigger>
          <MenuButton>Actions</MenuButton>
          <MenuPopover>
            <Menu
              aria-label="Record actions"
              onAction={id => setAction(String(id))}
            >
              <MenuItem id="Export records">Export records</MenuItem>
              <MenuSeparator />
              <MenuItem id="Copy link">Copy link</MenuItem>
            </Menu>
          </MenuPopover>
        </MenuTrigger>
        <output aria-label="Last filter action">{action}</output>
      </FilterBar>
    </Stack>
  );
}
