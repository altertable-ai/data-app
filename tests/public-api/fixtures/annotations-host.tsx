import { useEffectEvent, useRef, useState } from 'react';
import {
  AnnotationBar,
  injectDataAppAnnotationStyles,
  type AnnotationBarHandle,
} from '@altertable/data-app/react';
import { createRoot } from 'react-dom/client';
import { DataAppBridge } from '@altertable/data-app/react/embed';
import {
  createMessageRouter,
  annotationDraftRoute,
  annotationUpdateRoute,
  annotationModeRoute,
  annotationEditorStateRoute,
  annotationSendRoute,
  MessageRoutingError,
  type DataAppAnnotationDraft,
} from '@altertable/data-app/contract';
const params = new URLSearchParams(location.search);
injectDataAppAnnotationStyles();
const javascript = await fetch(
  params.has('annotation-state')
    ? '/__test/annotation-state'
    : '/__test/annotations'
).then(response => response.text());
function Host() {
  const [drafts, setDrafts] = useState<DataAppAnnotationDraft[]>([]);
  const [failed, setFailed] = useState(params.has('annotation-error'));
  const [version, setVersion] = useState(1);
  const [active, setActive] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sendFailed, setSendFailed] = useState(
    params.has('annotation-send-error')
  );
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
    }
  );
  return (
    <>
      <output aria-label="Annotation drafts">{JSON.stringify(drafts)}</output>
      <output aria-label="Submitted annotations">
        {JSON.stringify(submitted)}
      </output>
      {params.has('annotation-send') && (
        <>
          <button onClick={() => setActive(value => !value)}>Annotate</button>
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
        source={{ type: 'bundle', bootstrapUrl: '/__test/runtime', javascript }}
        presentation={{
          surface: 'embedded',
          theme: 'light',
          ...(params.has('annotations')
            ? {
                annotations: {
                  enabled: true,
                  ...(params.has('annotation-send') ? { active } : {}),
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
        onMessage={router.dispatch}
      />
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Host />);
