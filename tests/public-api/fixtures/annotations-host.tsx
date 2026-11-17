import { createNavigationHandler } from '@altertable/data-app-embed';
import { DataAppBridge } from '@altertable/data-app-embed/react';
import {
  AnnotationBar,
  injectDataAppAnnotationStyles,
  type AnnotationBarHandle,
} from '@altertable/data-app-react';
import {
  createMessageRouter,
  annotationDraftRoute,
  annotationUpdateRoute,
  annotationModeRoute,
  annotationEditorStateRoute,
  annotationSendRoute,
  navigationUpdateRoute,
  MessageRoutingError,
  type DataAppAnnotationDraft,
} from '@altertable/data-app/contract';
import { useEffectEvent, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
const params = new URLSearchParams(location.search);
injectDataAppAnnotationStyles();
const javascript = await fetch(
  params.has('annotation-state')
    ? '/__test/annotation-state'
    : '/__test/annotations'
).then(response => response.text());
const initialAnnotations: DataAppAnnotationDraft[] = params.has(
  'annotation-existing'
)
  ? [
      {
        id: 'persisted-revenue',
        target: {
          id: 'monthly-revenue',
          label: 'Revenue by month',
          kind: 'widget',
          text: 'Revenue',
          queryNames: ['revenue'],
          glossaryIds: [],
        },
        context: {
          search: '',
          hash: '',
          viewport: { width: 1280, height: 600 },
          rect: { x: 0, y: 0, width: 100, height: 100 },
          anchor: { x: 1, y: 0 },
        },
        comment: 'Persisted feedback from the previous SDK',
      },
    ]
  : [];

// Status outputs stay out of flow so their growing text never moves the frame.
const offscreen = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
} as const;

function Host() {
  const [drafts, setDrafts] = useState(initialAnnotations);
  const [failed, setFailed] = useState(params.has('annotation-error'));
  const [version, setVersion] = useState(1);
  const [active, setActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sendFailed, setSendFailed] = useState(
    params.has('annotation-send-error')
  );
  const [sendAttempts, setSendAttempts] = useState(0);
  const [submitted, setSubmitted] = useState<readonly DataAppAnnotationDraft[]>(
    []
  );
  const annotationBarRef = useRef<AnnotationBarHandle>(null);
  const sendAnnotations = useEffectEvent(async () => {
    await annotationBarRef.current?.send();
    return null;
  });
  const router = createMessageRouter(
    {
      'annotation:draft': annotationDraftRoute,
      'annotation:update': annotationUpdateRoute,
      'annotation:mode': annotationModeRoute,
      'annotation:editor': annotationEditorStateRoute,
      'annotation:send': annotationSendRoute,
      'navigation:update': navigationUpdateRoute,
    },
    {
      'annotation:draft'(draft) {
        if (failed)
          throw new MessageRoutingError(
            'unavailable',
            'Could not save annotation. Try again.'
          );
        setDrafts(previous => [...previous, draft]);
        return null;
      },
      'annotation:update'({ id, comment }) {
        setDrafts(previous =>
          previous.map(draft =>
            draft.id === id ? { ...draft, comment } : draft
          )
        );
        return null;
      },
      'annotation:mode'({ active }) {
        setActive(active);
        return null;
      },
      'annotation:editor'({ hasUnsavedChanges }) {
        setHasUnsavedChanges(hasUnsavedChanges);
        return null;
      },
      'annotation:send': sendAnnotations,
      'navigation:update': createNavigationHandler(),
    }
  );
  return (
    <>
      <output aria-label="Annotation drafts" style={offscreen}>
        {JSON.stringify(drafts)}
      </output>
      <output aria-label="Send attempts" style={offscreen}>
        {sendAttempts}
      </output>
      <output aria-label="App refreshing" style={offscreen}>
        {String(refreshing)}
      </output>
      <output aria-label="Submitted annotations" style={offscreen}>
        {JSON.stringify(submitted)}
      </output>
      {params.has('annotations') && (
        <button
          aria-pressed={active}
          onClick={() => setActive(value => !value)}
        >
          Annotate
        </button>
      )}
      {params.has('annotation-send') && (
        <>
          <button onClick={() => setSendFailed(false)}>Allow submission</button>
          <AnnotationBar
            ref={annotationBarRef}
            active={active}
            annotations={drafts}
            hasUnsavedChanges={hasUnsavedChanges}
            pinsVisible
            onPinsVisibleChange={() => {}}
            onSelect={() => {}}
            onDelete={id =>
              setDrafts(previous => previous.filter(draft => draft.id !== id))
            }
            onClear={() => setDrafts([])}
            onClose={() => setActive(false)}
            onSend={async snapshot => {
              setSendAttempts(value => value + 1);
              if (sendFailed) throw new Error('Submission rejected');
              setSubmitted(snapshot);
              setDrafts([]);
            }}
          />
        </>
      )}
      <button onClick={() => setFailed(false)}>Allow annotations</button>
      <button onClick={() => setVersion(value => value + 1)}>
        Replace app
      </button>
      <DataAppBridge
        key={version}
        title="Feedback app"
        iframeProps={{
          style: { display: 'block', width: '100%', height: 600 },
        }}
        source={{ type: 'bundle', bootstrapUrl: '/__test/runtime', javascript }}
        presentation={{
          surface: 'embedded',
          theme: 'light',
          ...(params.has('annotations')
            ? {
                annotations: {
                  enabled: true,
                  active,
                  targets: drafts.map((draft, index) => ({
                    id: draft.id,
                    targetId: draft.target.id,
                    number: index + 1,
                    comment: draft.comment,
                    anchor: draft.context.anchor,
                    region: draft.context.region,
                  })),
                },
              }
            : {}),
        }}
        onActionsChange={actions =>
          setRefreshing(actions.refresh?.refreshing ?? false)
        }
        onMessage={router.dispatch}
      />
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Host />);
