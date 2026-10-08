import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataAppBridge } from '@altertable/data-app/react/embed';
import {
  createMessageRouter,
  annotationDraftRoute,
  annotationUpdateRoute,
  annotationModeRoute,
  annotationEditorStateRoute,
  MessageRoutingError,
  type DataAppAnnotationDraft,
} from '@altertable/data-app/contract';
const params = new URLSearchParams(location.search);
const javascript = await fetch(
  params.has('annotation-state')
    ? '/__test/annotation-state'
    : '/__test/annotations'
).then(response => response.text());
function Host() {
  const [drafts, setDrafts] = useState<DataAppAnnotationDraft[]>([]);
  const [failed, setFailed] = useState(params.has('annotation-error'));
  const [version, setVersion] = useState(1);
  const router = createMessageRouter(
    {
      'annotation:draft': annotationDraftRoute,
      'annotation:update': annotationUpdateRoute,
      'annotation:mode': annotationModeRoute,
      'annotation:editor': annotationEditorStateRoute,
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
      'annotation:mode'() {
        return null;
      },
      'annotation:editor'() {
        return null;
      },
    }
  );
  return (
    <>
      <output aria-label="Annotation drafts">{JSON.stringify(drafts)}</output>
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
