import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  loadAnnotationDrafts,
  saveAnnotationDrafts,
} from '@/dev/fixtures/annotation-storage';
import { createAnnotationDraftStore } from '@/dev/fixtures/annotation-drafts';

/** Host collection is independent of agent submission. Supply an account/app-scoped key for recovery. */
type AnnotationDraftsOptions = {
  sourceVersion: string;
  storageKey?: string;
};

export function useAnnotationDrafts({
  sourceVersion,
  storageKey,
}: AnnotationDraftsOptions) {
  const store = useMemo(
    () =>
      createAnnotationDraftStore(
        sourceVersion,
        storageKey
          ? {
              load: () => loadAnnotationDrafts(storageKey),
              save: snapshot => saveAnnotationDrafts(storageKey, snapshot),
            }
          : undefined
      ),
    [sourceVersion, storageKey]
  );
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  useEffect(() => {
    void store.restore();
    return () => store.stopPersistence();
  }, [store]);
  return {
    drafts: state.drafts,
    count: state.drafts.length,
    ready: state.ready,
    storageError: state.storageError,
    persisting: state.persisting,
    deletedAnnotationId: state.deleted?.id,
    addAnnotation: store.addAnnotation,
    updateAnnotation: store.updateAnnotation,
    deleteAnnotation: store.deleteAnnotation,
    undoDelete: store.undoDelete,
    dismissUndo: store.dismissUndo,
    clearAnnotations: store.clearAnnotations,
    acknowledgeSubmission: store.acknowledgeSubmission,
    flushPersistence: store.flushPersistence,
  };
}
