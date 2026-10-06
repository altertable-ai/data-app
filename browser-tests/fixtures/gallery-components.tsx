import type { DataAppConfig } from '@altertable/data-app/config';
import {
  Button,
  DataApp,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';
import { GalleryBasics } from '@/browser-tests/fixtures/gallery-basics';
import '@/browser-tests/fixtures/gallery.css';

const config = {
  title: 'Component gallery',
  scope: { organization: 'Demo workspace', environment: 'Sample data' },
  appearance: { theme: 'light' },
} satisfies DataAppConfig;

function ComponentGallery() {
  return (
    <DataApp
      config={config}
      dataContext={{
        description: 'Synthetic data for exploring composable data displays.',
        glossary: {},
      }}
      description="Data displays you can compose inside VisualizationWidget. Each example uses the same frame so you can compare tables, charts, rankings, and breakdowns."
      toolbarActions={
        <Button onClick={() => window.location.assign('/gallery')}>
          Back to app gallery
        </Button>
      }
    >
      <GalleryBasics />
    </DataApp>
  );
}

injectDataAppStyles();
mountDataApp({ config, component: ComponentGallery });
