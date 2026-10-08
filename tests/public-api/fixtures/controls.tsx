import { useState } from 'react';
import { mountDataApp, injectDataAppStyles } from '@altertable/data-app/react';
import {
  ChoicePicker,
  Select,
  RadioGroup,
  Radio,
  SegmentedControl,
  CheckboxGroup,
  Checkbox,
  NumberField,
  NumberRangeField,
  FilterActions,
  MenuTrigger,
  MenuButton,
  MenuPopover,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
  type DataAppStyle,
} from '@altertable/data-app/react/ui';

const config = {
  title: 'Controls',
  scope: { organization: 'test', environment: 'test' },
  appearance: {},
};
const options = [
  { id: 'all', label: 'All' },
  { id: 'fr', label: 'France' },
  { id: 'uk', label: 'United Kingdom' },
];
const inputStyle = {
  fontFamily: 'var(--atbl-font)',
  '--atbl-control-text-size': '13px',
} satisfies DataAppStyle;
function App() {
  const [country, setCountry] = useState('uk');
  const [countries, setCountries] = useState<string[]>(['fr']);
  const [sort, setSort] = useState('highest');
  const [actions, setActions] = useState(0);
  const [currency, setCurrency] = useState('eur');
  const [metric, setMetric] = useState('orders');
  const [grouping, setGrouping] = useState('daily');
  const [states, setStates] = useState<string[]>(['paid']);
  const [threshold, setThreshold] = useState<number | null>(0);
  const [range, setRange] = useState<{ min?: number; max?: number }>({});
  return (
    <main style={inputStyle}>
      <ChoicePicker
        selectionMode="single"
        label="Country"
        options={options}
        value={country}
        onChange={setCountry}
      />
      <ChoicePicker
        selectionMode="multiple"
        label="Countries"
        options={options.slice(1)}
        values={countries}
        onChange={setCountries}
        maxSelected={2}
        emptySelectionLabel="All"
      />
      <MenuTrigger>
        <MenuButton>Display options</MenuButton>
        <MenuPopover>
          <Menu aria-label="Display options">
            <MenuSection
              aria-label="Sort order"
              selectionMode="single"
              selectedKeys={[sort]}
              onSelectionChange={keys => {
                if (keys !== 'all') setSort(String([...keys][0]));
              }}
            >
              <MenuItem id="highest">Highest first</MenuItem>
              <MenuItem id="lowest">Lowest first</MenuItem>
            </MenuSection>
            <MenuSeparator />
            <MenuItem id="unavailable" isDisabled>
              Unavailable
            </MenuItem>
            <MenuItem id="refresh" onAction={() => setActions(actions + 1)}>
              Refresh
            </MenuItem>
          </Menu>
        </MenuPopover>
      </MenuTrigger>
      <MenuTrigger>
        <MenuButton>Visible columns</MenuButton>
        <MenuPopover>
          <Menu
            aria-label="Visible columns"
            selectionMode="multiple"
            defaultSelectedKeys={['name']}
            shouldCloseOnSelect={false}
          >
            <MenuItem id="name">Name</MenuItem>
            <MenuItem id="count">Count</MenuItem>
          </Menu>
        </MenuPopover>
      </MenuTrigger>
      <section aria-label="Filter primitives">
        <Select
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={[
            { id: 'eur', label: 'Euro' },
            { id: 'usd', label: 'US dollar' },
          ]}
        />
        <RadioGroup label="Metric" value={metric} onChange={setMetric}>
          <Radio value="orders">Orders</Radio>
          <Radio value="revenue">Revenue</Radio>
        </RadioGroup>
        <SegmentedControl
          label="Grouping"
          value={grouping}
          onChange={setGrouping}
          options={[
            { id: 'daily', label: 'Daily' },
            { id: 'monthly', label: 'Monthly' },
          ]}
        />
        <CheckboxGroup label="States" values={states} onChange={setStates}>
          <Checkbox value="paid" label="Paid" />
          <Checkbox value="pending" label="Pending" />
        </CheckboxGroup>
        <NumberField
          label="Threshold"
          value={threshold}
          onChange={setThreshold}
        />
        <NumberRangeField
          label="Order amount"
          value={range}
          onChange={setRange}
        />
        <FilterActions
          onApply={() => setActions(count => count + 1)}
          onCancel={() => setActions(0)}
        />
        <output aria-label="Primitive values">
          {JSON.stringify({
            currency,
            metric,
            grouping,
            states,
            threshold,
            range,
          })}
        </output>
      </section>
      <output aria-label="Refresh count">{actions}</output>
    </main>
  );
}
injectDataAppStyles();
mountDataApp({ config, component: App });
