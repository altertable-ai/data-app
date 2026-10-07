import { useRef, useState } from 'react';
import {
  AnnotationBar,
  AppIcon,
  Button,
  injectDataAppAnnotationStyles,
  useAnnotationDrafts,
} from '@altertable/data-app/react';
import {
  DataAppBridge,
  type DataAppBridgeProps,
} from '@altertable/data-app/react/embed';
import {
  annotationDraftRoute,
  annotationEditorStateRoute,
  annotationModeRoute,
  annotationUpdateRoute,
  createMessageRouter,
  MessageRoutingError,
  type DataAppAnnotationDraft,
  type DataAppAnnotationPresentation,
} from '@altertable/data-app/contract';

if (typeof document !== 'undefined') injectDataAppAnnotationStyles();

/** This adapter is shared with the playground so its lifecycle is exercised by browser tests. */
export function useAnnotationHost(options: {
  sourceVersion: string;
  storageKey?: string;
}) {
  const collection = useAnnotationDrafts(options);
  const [active, setActive] = useState(false);
  const [pinsVisible, setPinsVisible] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string>();
  const [selectionId, setSelectionId] = useState<string>();
  const scopeKey = `${options.storageKey ?? ''}:${options.sourceVersion}`;
  const [previousScopeKey, setPreviousScopeKey] = useState(scopeKey);
  if (previousScopeKey !== scopeKey) {
    setPreviousScopeKey(scopeKey);
    setActive(false);
    setHasUnsavedChanges(false);
    setSelectedAnnotationId(undefined);
    setSelectionId(undefined);
  }
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  function writable() {
    if (submitting.current)
      throw new MessageRoutingError(
        'busy',
        'Wait for annotations to finish sending.'
      );
  }
  const handlers = {
    async 'annotation:draft'(draft: DataAppAnnotationDraft) {
      writable();
      collection.addAnnotation(draft);
      await collection.flushPersistence();
      return null;
    },
    async 'annotation:update'({
      id,
      comment,
    }: {
      id: string;
      comment: string;
    }) {
      writable();
      collection.updateAnnotation(id, comment);
      await collection.flushPersistence();
      return null;
    },
    'annotation:mode'({ active }: { active: boolean }) {
      setActive(active);
      return null;
    },
    'annotation:editor'({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) {
      setHasUnsavedChanges(hasUnsavedChanges);
      return null;
    },
  };
  const presentation: DataAppAnnotationPresentation = {
    enabled: true,
    active,
    pinsVisible,
    showHint: collection.drafts.length === 0,
    readOnly: pending || !collection.ready,
    selectedAnnotationId,
    selectionId,
    targets: collection.drafts.map((draft, index) => ({
      id: draft.id,
      targetId: draft.target.id,
      number: index + 1,
      comment: draft.comment,
      anchor: draft.context.anchor,
      region: draft.context.region,
    })),
  };
  async function submit(
    snapshot: readonly DataAppAnnotationDraft[],
    submitToAgent: (drafts: readonly DataAppAnnotationDraft[]) => Promise<void>
  ) {
    if (submitting.current || hasUnsavedChanges || !collection.ready)
      throw new Error('Annotation submission is unavailable.');
    submitting.current = true;
    setPending(true);
    try {
      await submitToAgent(snapshot);
      collection.acknowledgeSubmission(snapshot);
      setSelectedAnnotationId(undefined);
      setActive(false);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  function selectAnnotation(id: string) {
    setSelectedAnnotationId(id);
    setSelectionId(crypto.randomUUID());
  }
  function deleteAnnotation(id: string) {
    collection.deleteAnnotation(id);
    if (selectedAnnotationId === id) setSelectedAnnotationId(undefined);
  }
  function clearAnnotations() {
    collection.clearAnnotations();
    setSelectedAnnotationId(undefined);
  }
  return {
    ...collection,
    active,
    setActive,
    pinsVisible,
    setPinsVisible,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    pending,
    presentation,
    handlers,
    submit,
    selectAnnotation,
    deleteAnnotation,
    clearAnnotations,
  };
}

/** Complete annotation integration. Add your data routes alongside these authenticated routes. */
export function AnnotationHost({
  javascript,
  bootstrapUrl,
  appKey,
  sourceVersion,
  submitToAgent,
  onAppMessage,
}: {
  javascript: string;
  bootstrapUrl: string;
  onAppMessage: DataAppBridgeProps['onMessage'];
  /** Include organization/account and app IDs to isolate locally retained feedback. */
  appKey: string;
  sourceVersion: string;
  /** Resolve only when the agent API accepts this exact snapshot; reject to preserve it for retry. */
  submitToAgent: (drafts: readonly DataAppAnnotationDraft[]) => Promise<void>;
}) {
  const host = useAnnotationHost({ sourceVersion, storageKey: appKey });
  const router = createMessageRouter(
    {
      'annotation:draft': annotationDraftRoute,
      'annotation:update': annotationUpdateRoute,
      'annotation:mode': annotationModeRoute,
      'annotation:editor': annotationEditorStateRoute,
    },
    host.handlers
  );
  return (
    <>
      <Button
        disabled={!host.ready}
        aria-pressed={host.active}
        onClick={() => host.setActive(value => !value)}
      >
        <AppIcon name="annotate" size={16} /> Annotate{' '}
        {host.drafts.length || ''}
      </Button>
      {host.persisting && <output>Saving annotations locally…</output>}
      {host.storageError && (
        <output>
          Local recovery is unavailable. Keep this page open until you send the
          annotations.
        </output>
      )}
      <DataAppBridge
        title="Data app"
        source={{ type: 'bundle', javascript, bootstrapUrl }}
        presentation={{
          surface: 'embedded',
          theme: 'light',
          annotations: host.presentation,
        }}
        onMessage={(request, context) =>
          request &&
          typeof request === 'object' &&
          'route' in request &&
          typeof request.route === 'string' &&
          request.route.startsWith('annotation:')
            ? router.dispatch(request, context)
            : onAppMessage(request, context)
        }
      />
      {(host.active || host.deletedAnnotationId) && (
        <AnnotationBar
          active={host.active}
          annotations={host.drafts}
          pinsVisible={host.pinsVisible}
          onPinsVisibleChange={host.setPinsVisible}
          deletedAnnotationId={host.deletedAnnotationId}
          onUndoDelete={id => host.undoDelete(id)}
          onDismissUndo={() => host.dismissUndo()}
          disabled={host.pending || !host.ready}
          hasUnsavedChanges={host.hasUnsavedChanges}
          onSelect={host.selectAnnotation}
          onDelete={host.deleteAnnotation}
          onClear={host.clearAnnotations}
          onClose={() => host.setActive(false)}
          onSend={snapshot => host.submit(snapshot, submitToAgent)}
        />
      )}
    </>
  );
}
