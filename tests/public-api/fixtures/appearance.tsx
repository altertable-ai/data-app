import { createRoot } from 'react-dom/client';
import { applyAppearance } from '@altertable/data-app/appearance';
import {
  Button,
  injectDataAppStyles,
  type DataAppStyle,
} from '@altertable/data-app/react';
import { Select, ChoicePicker } from '@altertable/data-app/react/ui';
let cleanup: (() => void) | undefined;
const actionStyle: DataAppStyle = {
  '--atbl-control-height': '60px',
  color: 'var(--atbl-accent)',
};
function App() {
  return (
    <main>
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
