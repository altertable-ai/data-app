import { useState } from 'react';
import { mountDataApp, injectDataAppStyles } from '@altertable/data-app/react';
import {
  Combobox,
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
  return (
    <main style={inputStyle}>
      <Combobox
        label="Country"
        options={options}
        value={country}
        onChange={setCountry}
        resetValue="all"
      />
      <Combobox
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
      <output aria-label="Refresh count">{actions}</output>
    </main>
  );
}
injectDataAppStyles();
mountDataApp({ config, component: App });
