import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { applyAppearance } from '@altertable/data-app/appearance';
import { numberFilter } from '@altertable/data-app/contract';
import {
  Button,
  Comparison,
  Grid,
  injectDataAppStyles,
  type DataAppStyle,
} from '@altertable/data-app/react';
import {
  Select,
  LiveControl,
  ChoicePicker,
  NumberFilterPicker,
  DataWidget,
  SearchField,
  Sheet,
} from '@altertable/data-app/react/ui';
let cleanup: (() => void) | undefined;
const actionStyle: DataAppStyle = {
  '--atbl-control-height': '60px',
  color: 'var(--atbl-accent)',
};
function App() {
  const [customStatus, setCustomStatus] = useState(false);
  const [live, setLive] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [explicitLocalTokens, setExplicitLocalTokens] = useState(false);
  const localStyle: DataAppStyle = {
    '--atbl-type-body-size': '20px',
    '--atbl-danger': '#0000ff',
    '--atbl-surface': '#000000',
    ...(explicitLocalTokens
      ? { '--atbl-control-text-size': '24px', '--atbl-negative': '#8040c0' }
      : {}),
  };
  const spacingStyle: DataAppStyle = {
    '--atbl-layout-gap': '40px',
    '--atbl-surface-padding': '12px',
  };
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
      <LiveControl
        enabled={live}
        onChange={setLive}
        intervalSeconds={60}
        onIntervalChange={() => {}}
      />
      <section aria-label="Local appearance" style={localStyle}>
        <SearchField label="Local search" value="" onChange={() => {}} />
        <Select
          label="Local ordering"
          labelPlacement="above"
          options={[{ id: 'name', label: 'Name' }]}
          value="name"
          onChange={() => {}}
        />
        <Comparison
          label="Local revenue"
          current={{ value: 10, formattedValue: '10' }}
          previous={{ value: 20, formattedValue: '20' }}
          favorableDirection="up"
        />
      </section>
      <Button onClick={() => setExplicitLocalTokens(true)}>
        Override local defaults
      </Button>
      <Grid aria-label="Spacing layout" columns={2} style={spacingStyle}>
        <DataWidget title="Padding example">
          <p>Content</p>
        </DataWidget>
        <DataWidget title="Padding peer">
          <p>Content</p>
        </DataWidget>
      </Grid>
      <Button
        size="compact"
        style={{ boxShadow: 'var(--atbl-shadow-control)' }}
      >
        Compact action
      </Button>
      {(['compact', 'comfortable', 'spacious'] as const).map(density => (
        <Button
          key={density}
          onClick={() => {
            cleanup?.();
            cleanup = applyAppearance({ density });
          }}
        >
          Apply density {density}
        </Button>
      ))}
      {(['flat', 'subtle', 'raised'] as const).map(elevation => (
        <Button
          key={elevation}
          onClick={() => {
            cleanup?.();
            cleanup = applyAppearance({ elevation });
          }}
        >
          Apply elevation {elevation}
        </Button>
      ))}
      <Button onClick={() => setSheetOpen(true)}>Open appearance sheet</Button>
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Appearance sheet"
      >
        <p>Sheet content</p>
      </Sheet>
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
