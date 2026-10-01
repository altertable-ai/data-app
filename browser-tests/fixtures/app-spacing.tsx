import { useState } from 'react';
import type { DataAppConfig } from '@altertable/data-app/config';
import {
  Button,
  DataApp,
  defineDataContent,
  Grid,
  MetricWidget,
  TextContent,
  TextWidget,
  type WidgetEvidence,
} from '@altertable/data-app/react';

const evidence: WidgetEvidence = {
  id: 'spacing',
  queryNames: ['sample-counts'],
};
const content = defineDataContent<number, undefined>(result => (
  <>
    <TextWidget
      title="Production at a glance"
      evidence={evidence}
      reading={result.select(count => count)}
    >
      {count => <p>{count} sample events.</p>}
    </TextWidget>
    <Grid columns={3} aria-label="Summary metrics">
      {['Logs', 'Errors', 'Spans'].map(label => (
        <MetricWidget
          key={label}
          label={label}
          {...(result.loading
            ? { loading: true as const }
            : { value: result.data, format: { kind: 'count' as const } })}
        />
      ))}
    </Grid>
    <TextContent aria-label="Log introduction">
      <h2>Logs</h2>
      <p>Inspect sample volume and severity.</p>
    </TextContent>
    <Grid columns={2} aria-label="Log charts">
      <TextWidget title="Log volume">Sample chart</TextWidget>
      <TextWidget title="Log severity">Sample chart</TextWidget>
    </Grid>
  </>
));

export function AppSpacing({ config }: { config: DataAppConfig }) {
  const [loaded, setLoaded] = useState(false);
  const shell = {
    config,
    dataContext: { description: 'Layout fixture', glossary: {} },
  };
  if (new URLSearchParams(location.search).get('spacing') === 'static')
    return <DataApp {...shell}>{content.children(20, undefined)}</DataApp>;

  return (
    <DataApp
      {...shell}
      {...content}
      toolbarActions={
        <Button onClick={() => setLoaded(true)}>Load sample</Button>
      }
      request={{
        view: loaded
          ? { kind: 'ready', data: 20, input: undefined }
          : { kind: 'loading' },
        refetch: () => {},
        empty: { title: 'No events' },
      }}
    />
  );
}
