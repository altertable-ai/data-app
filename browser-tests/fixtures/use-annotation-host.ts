import { useRef, useState } from 'react';
import { injectDataAppAnnotationStyles } from '@altertable/data-app/react';
import { useAnnotationDrafts } from '@/browser-tests/fixtures/useAnnotationDrafts';
import {
  MessageRoutingError,
  type DataAppAnnotationDraft,
  type DataAppAnnotationPresentation,
} from '@altertable/data-app/contract';

if (typeof document !== 'undefined') injectDataAppAnnotationStyles();

/** Annotation collection and persistence belong to this playground host. */
type AnnotationHostOptions = {
  sourceVersion: string;
  storageKey?: string;
};

export function useAnnotationHost(options: AnnotationHostOptions) {
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
