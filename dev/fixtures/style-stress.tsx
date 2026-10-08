import { AppFooter } from '@/src/react/ui/AppFooter';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { AppHeader } from '@/src/react/ui/AppHeader';
import { AppLayout } from '@/src/react/ui/AppLayout';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { applyAppearance } from '@altertable/data-app/appearance';
import {
  ChoicePicker,
  DateRangePicker,
  SearchField,
  LiveControl,
  MetricWidget,
  DataWidget,
  DataTable,
} from '@altertable/data-app/react/ui';
import {
  injectDataAppStyles,
  Button,
  Grid,
  Comparison,
  TextContent,
} from '@altertable/data-app/react';

injectDataAppStyles();
const params = new URLSearchParams(location.search);
applyAppearance({ theme: params.has('dark') ? 'dark' : 'light' });
const exactValue = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
}).format(12345678901234567890n);

// Synthetic extremes for rendering checks, not an analytical app or authoring recipe.
function Stress() {
  const [query, setQuery] = useState('Une recherche avec beaucoup de mots');
  const [region, setRegion] = useState('long');
  const [dates, setDates] = useState<{ start: string; end: string } | null>({
    start: '2026-09-24',
    end: '2026-09-30',
  });
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <AppLayout
      footer={
        <AppFooter
          attribution={
            <a href="#root">
              Attribution with a deliberately long organization name and
              explanatory text
            </a>
          }
        >
          <Button>
            Footer action with a very long but meaningful accessible label
          </Button>
        </AppFooter>
      }
    >
      <AppHeader
        title="A long finding heading that must retain hierarchy and wrap in a narrow embedded viewport"
        description="Synthetic rendering limits for controls, precision, localization and text enlargement."
      />
      <TextContent>
        <h2>Scoped controls and exact values</h2>
        <p>
          Controls retain their names and keyboard access while the layout
          wraps. Numerical strings deliberately preserve every supplied digit.
        </p>
      </TextContent>
      <VariableBar aria-label="Stress controls">
        <ChoicePicker
          selectionMode="single"
          label="Organization and geographic reporting region"
          options={[
            {
              id: 'long',
              label: 'A very long region and reporting organization name',
            },
          ]}
          value={region}
          onChange={setRegion}
        />
        <DateRangePicker
          label="Reporting dates"
          value={dates}
          onChange={setDates}
          minDate="2026-09-01"
          maxDate="2026-09-30"
          maxRangeDays={30}
          comparison={{
            enabled: true,
            range: { start: '2026-09-17', end: '2026-09-23' },
            onChange: () => {},
          }}
        />
        <SearchField
          label="Search unusually long customer names"
          value={query}
          onChange={setQuery}
        />
        <LiveControl
          enabled={live}
          onChange={setLive}
          intervalSeconds={30}
          onIntervalChange={() => {}}
        />
        <Button onClick={() => setLoading(!loading)}>
          Toggle the value loading state without removing its heading
        </Button>
      </VariableBar>
      <Grid columns={2}>
        <MetricWidget
          label="A precisely formatted amount with an exceptionally long descriptive label"
          {...(loading ? { loading: true as const } : { content: exactValue })}
        />
        <DataWidget title="A comparison with long period descriptions">
          <Comparison
            label="Full precision comparison"
            current={{
              value: 1e20,
              formattedValue: exactValue,
              periodLabel: 'Current period with a long localized description',
            }}
            previous={{
              value: 9e19,
              formattedValue: exactValue,
              periodLabel: 'Previous period with a long localized description',
            }}
          />
        </DataWidget>
        <DataWidget title="Scrollable localized records">
          <DataTable aria-label="Exact localized records">
            <thead>
              <tr>
                <th>
                  Organisation et description complète du périmètre géographique
                </th>
                <th data-type="number">
                  Montant total avec une précision volontairement inhabituelle
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Une organisation avec un nom très long et un périmètre
                  international
                </td>
                <td data-type="number">{exactValue}</td>
              </tr>
            </tbody>
          </DataTable>
        </DataWidget>
      </Grid>
    </AppLayout>
  );
}
createRoot(document.querySelector('#root')!).render(<Stress />);
