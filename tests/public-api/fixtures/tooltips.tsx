import {
  injectDataAppStyles,
  Button,
  IconButton,
} from '@altertable/data-app-react';
import { Tooltip, TooltipProvider } from '@altertable/data-app-react/ui';
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const dialog = useRef<HTMLDialogElement>(null);
  const portal = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [pressed, setPressed] = useState(0);
  return (
    <main style={{ padding: 24, display: 'grid', gap: 24 }}>
      <TooltipProvider delay={500} skipDelayDuration={300}>
        <section aria-label="Toolbar" style={{ display: 'flex', gap: 24 }}>
          <Tooltip content="First hint">
            <Button
              aria-describedby="existing-description"
              onClick={() => setPressed(value => value + 1)}
            >
              First
            </Button>
          </Tooltip>
          <Tooltip content="Second hint">
            <Button>Second</Button>
          </Tooltip>
          <IconButton
            icon="info"
            label="Information"
            tooltip="Custom component hint"
          />
        </section>
        <span id="existing-description">Existing description</span>
        <output aria-label="Presses">{pressed}</output>
        <Tooltip
          content="Unavailable until data arrives"
          tabIndex={0}
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Tooltip owns a span wrapper; its accessible name needs group semantics.
          role="group"
          aria-label="Disabled action"
        >
          <Button disabled>Unavailable</Button>
        </Tooltip>
        <Tooltip
          content="Text description"
          tabIndex={0}
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Tooltip owns a span wrapper; its accessible name needs group semantics.
          role="group"
          aria-label="Text trigger"
        >
          Plain text
        </Tooltip>
        <Tooltip content={content ? 'Dynamic hint' : null}>
          <Button>Dynamic</Button>
        </Tooltip>
        <Button onClick={() => setContent(value => !value)}>
          Toggle content
        </Button>
        {mounted && (
          <Tooltip content="Unmountable hint">
            <Button>Unmountable</Button>
          </Tooltip>
        )}
        <Button onClick={() => setMounted(value => !value)}>
          Toggle trigger
        </Button>
        <div style={{ overflow: 'hidden', height: 32 }}>
          <Tooltip content="Outside the clipping container" portalRoot={portal}>
            <Button>Portal</Button>
          </Tooltip>
        </div>
        <section ref={portal} aria-label="Portal destination" />
        <Button onClick={() => dialog.current?.showModal()}>Open dialog</Button>
        <dialog ref={dialog} aria-label="Tooltip dialog">
          <Tooltip content="Inside the modal">
            <Button>Dialog trigger</Button>
          </Tooltip>
          <Button onClick={() => dialog.current?.close()}>Close dialog</Button>
        </dialog>
        <div style={{ position: 'fixed', bottom: 8, right: 8 }}>
          <Tooltip
            content={'LongUnbrokenDescription'.repeat(16)}
            placement="bottom"
            align="end"
          >
            <Button>Edge</Button>
          </Tooltip>
        </div>
      </TooltipProvider>
      <Tooltip content="Standalone hint">
        <Button>Standalone</Button>
      </Tooltip>
    </main>
  );
}
injectDataAppStyles();
createRoot(document.getElementById('root')!).render(<App />);
