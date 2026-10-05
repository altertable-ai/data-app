import { attachDataAppBridge } from '@/src/embed/bridge';
import {
  createMessageRouter,
  defineMessageRoute,
  registeredQueryRoute,
  navigationUpdateRoute,
} from '@/src/core/messages';
import { createNavigationHandler } from '@/src/embed/navigation';

const token = document.querySelector<HTMLMetaElement>(
  'meta[name="query-token"]'
)!.content;
const frame = document.querySelector<HTMLIFrameElement>('iframe')!;
const fileRoute = defineMessageRoute({
  input(value: unknown) {
    const file = value as { filename: string; blob: Blob };
    if (
      !file ||
      typeof file.filename !== 'string' ||
      !(file.blob instanceof Blob)
    )
      throw new Error('Invalid export.');
    return file;
  },
  output: () => null,
});
function download({ filename, blob }: { filename: string; blob: Blob }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return null;
}
const router = createMessageRouter(
  {
    'data:query': registeredQueryRoute,
    'navigation:update': navigationUpdateRoute,
    'export:csv': fileRoute,
    'export:zip': fileRoute,
  },
  {
    async 'data:query'(query, { signal }) {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-data-app-token': token,
        },
        body: JSON.stringify(query),
        signal,
      });
      if (!response.ok) throw new Error('The data request failed.');
      return registeredQueryRoute.output(await response.json(), query);
    },
    'navigation:update': createNavigationHandler(),
    'export:csv': download,
    'export:zip': download,
  }
);
async function start() {
  const response = await fetch('/__local/app.js');
  if (!response.ok) throw new Error('Could not build the data app.');
  attachDataAppBridge({
    iframe: frame,
    source: {
      type: 'bundle',
      bootstrapUrl: '/__local/runtime',
      javascript: await response.text(),
    },
    onMessage: router.dispatch,
    onStatusChange(status) {
      document.querySelector('[role="status"]')!.textContent =
        status === 'failed'
          ? 'Could not load the data app. Reload to retry.'
          : '';
    },
  });
}
void start().catch(() => {
  document.querySelector('[role="status"]')!.textContent =
    'Could not load the data app. Check the server output and reload.';
});
