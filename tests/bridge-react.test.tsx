import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataAppBridge } from '@/src/react/embed/index';

async function onMessage() {
  return null;
}

test('source bridge leaves presentation and visibility to the consuming shell', () => {
  const markup = renderToStaticMarkup(
    <DataAppBridge
      title="Activity report"
      source={{ type: 'url', url: 'https://app.example/report' }}
      onMessage={onMessage}
      iframeProps={{ className: 'report', 'aria-label': 'App content' }}
    />
  );
  expect(markup).toBe(
    '<iframe class="report" aria-label="App content" loading="eager" title="Activity report"></iframe>'
  );
  const hidden = renderToStaticMarkup(
    <DataAppBridge
      title="Activity report"
      source={{
        type: 'bundle',
        bootstrapUrl: '/runtime',
        javascript: '',
      }}
      onMessage={onMessage}
      iframeProps={{ hidden: true }}
    />
  );
  expect(hidden).toContain('hidden=""');
});

test('connection bridge leaves iframe rendering to the host', () => {
  expect(
    renderToStaticMarkup(
      <DataAppBridge
        iframe={null}
        connection={{ type: 'origin', origin: 'https://app.example' }}
        onMessage={onMessage}
      />
    )
  ).toBe('');
});
