import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  loadAnnotationDrafts,
  saveAnnotationDrafts,
} from '@/src/client/annotation-storage';
import { createAnnotationDraftStore } from '@/src/react/annotation-drafts';

/** Host collection is independent of agent submission. Supply an account/app-scoped key for recovery. */
export function useAnnotationDrafts({
  sourceVersion,
  storageKey,
}: {
  sourceVersion: string;
  storageKey?: string;
}) {
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
    ...store,
    ...state,
    count: state.drafts.length,
    deletedAnnotationId: state.deleted?.id,
  };
}
