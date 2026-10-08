import { injectDataAppShellStyles } from '@altertable/data-app/react/ui';
import { createRoot } from 'react-dom/client';
import { DataAppSkeleton } from '@altertable/data-app/react/ui';
import { applyAppearance } from '@altertable/data-app/appearance';

const params = new URLSearchParams(location.search);
applyAppearance({ theme: params.has('dark') ? 'dark' : 'light' });
injectDataAppShellStyles({ nonce: 'shell-test' });
// Verify repeated calls reuse the style element and preserve its first nonce.
injectDataAppShellStyles({ nonce: 'ignored' });

createRoot(document.getElementById('root')!).render(
  <div
    style={{
      display: 'flex',
      width: params.has('narrow') ? 300 : '100%',
      maxWidth: '100%',
      minHeight: '100dvh',
    }}
  >
    <DataAppSkeleton
      aria-label="Loading fixture app"
      header={params.has('header') ? <h1>Activity report</h1> : undefined}
      footer={
        params.has('footer') ? (
          <a href="#about">About this report</a>
        ) : undefined
      }
    />
  </div>
);
