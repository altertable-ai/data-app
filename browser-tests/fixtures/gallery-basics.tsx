import { useState, type ReactNode } from 'react';
import {
  Breakdown,
  ComparisonVisual,
  DataTable,
  Grid,
  Ranking,
  SelectableBarChart,
  VisualizationWidget,
} from '@altertable/data-app/react';

const segments = [
  { id: 'product', label: 'Product', value: 45 },
  { id: 'services', label: 'Services', value: 35 },
  { id: 'other', label: 'Other', value: 20 },
];
const days = [
  { id: 'mon', label: 'Monday', value: 12 },
  { id: 'tue', label: 'Tuesday', value: 8 },
  { id: 'wed', label: 'Wednesday', value: 16 },
];

function Example({
  name,
  description,
  children,
}: {
  name: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={`${name} basic example`}>
      <VisualizationWidget
        title={name}
        description={description}
        visual={children}
      />
    </section>
  );
}

/** One ready example per composable data display, inside the shared visualization frame. */
export function GalleryBasics() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Grid columns={2}>
      <Example
        name="ComparisonVisual"
        description="Compare one metric across two periods."
      >
        <ComparisonVisual
          label="Recorded events"
          current={{ value: 120, formattedValue: '120' }}
          previous={{ value: 100, formattedValue: '100' }}
        />
      </Example>
      <Example
        name="Ranking"
        description="Compare ordered values; bars scale to the largest item."
      >
        <Ranking items={segments} />
      </Example>
      <Example
        name="Breakdown"
        description="Show mutually exclusive shares of an explicit total."
      >
        <Breakdown total={100} items={segments} />
      </Example>
      <Example
        name="SelectableBarChart"
        description="Explore daily values. Select a bar to inspect it."
      >
        <SelectableBarChart
          items={days}
          selectedId={selected}
          onSelectionChange={setSelected}
          unit="events"
          ariaLabel="Basic daily events"
        />
      </Example>
      <Example
        name="DataTable"
        description="Compose a table directly when you need custom headers and cells."
      >
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col" data-type="number">
                Events
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day.id}>
                <th scope="row">{day.label}</th>
                <td data-type="number">{day.value}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Example>
    </Grid>
  );
}
