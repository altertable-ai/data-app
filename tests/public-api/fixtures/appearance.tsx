import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { applyAppearance } from '@altertable/data-app/appearance';
import { numberFilter } from '@altertable/data-app/contract';
import {
  Button,
  Comparison,
  injectDataAppStyles,
  type DataAppStyle,
} from '@altertable/data-app/react';
import {
  Select,
  ChoicePicker,
  NumberFilterPicker,
} from '@altertable/data-app/react/ui';
let cleanup: (() => void) | undefined;
const actionStyle: DataAppStyle = {
  '--atbl-control-height': '60px',
  color: 'var(--atbl-accent)',
};
function App() {
  const [customStatus, setCustomStatus] = useState(false);
  return (
    <main>
      {customStatus && <style>{':root { --atbl-positive: #8040c0; }'}</style>}
      <h1>Appearance consumer</h1>
      <Button style={actionStyle}>Custom action</Button>
      <Button
        onClick={() => {
          cleanup?.();
          cleanup = applyAppearance({
            theme: 'dark',
            density: 'spacious',
            accentColor: '#336699',
            darkAccentColor: '#336699',
          });
        }}
      >
        Apply appearance
      </Button>
      <Button onClick={() => cleanup?.()}>Restore appearance</Button>
      <Button onClick={() => setCustomStatus(true)}>Customize status</Button>
      {(['light', 'dark'] as const).map(theme => (
        <Button
          key={theme}
          onClick={() => {
            cleanup?.();
            cleanup = applyAppearance({ theme });
          }}
        >
          Apply neutral {theme}
        </Button>
      ))}
      <NumberFilterPicker
        filter={numberFilter({ key: 'orders', label: 'Orders' })}
        value={{ kind: 'all' }}
        onChange={() => {}}
      />
      <Comparison
        label="Revenue"
        current={{ value: 20, formattedValue: '20' }}
        previous={{ value: 10, formattedValue: '10' }}
        favorableDirection="up"
      />
      <Select
        label="Sort by"
        options={[{ id: 'name', label: 'Name' }]}
        value="name"
        onChange={() => {}}
      />
      <ChoicePicker
        label="Segment"
        selectionMode="single"
        options={[{ id: 'enterprise', label: 'Enterprise' }]}
        value="enterprise"
        onChange={() => {}}
      />
      <Button
        onClick={() => {
          document.documentElement.style.setProperty(
            '--atbl-control-selected-surface',
            '#336699'
          );
          document.documentElement.style.setProperty(
            '--atbl-control-selected-text',
            '#ffffff'
          );
        }}
      >
        Customize selection
      </Button>
    </main>
  );
}
injectDataAppStyles();
createRoot(document.getElementById('root')!).render(<App />);
