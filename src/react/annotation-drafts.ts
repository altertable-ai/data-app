import { MessageRoutingError } from '@/src/core/messages';
import {
  parseDataAppAnnotationDraft,
  type DataAppAnnotationDraft,
} from '@/src/core/annotations';
import type { AnnotationDraftSnapshot } from '@/src/client/annotation-storage';

export function createAnnotationDraftStore(
  sourceVersion: string,
  persistence?: {
    load: () => Promise<AnnotationDraftSnapshot | undefined>;
    save: (snapshot: AnnotationDraftSnapshot) => Promise<void>;
  }
) {
  let state = {
    drafts: [] as DataAppAnnotationDraft[],
    ready: !persistence,
    outdated: false,
    storageError: false,
    persisting: false,
    deleted: undefined as DataAppAnnotationDraft | undefined,
  };
  let retainedVersion = sourceVersion;
  let writes = Promise.resolve();
  let pendingWrites = 0;
  let restoring: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  function publish() {
    for (const listener of listeners) listener();
  }
  function changed() {
    if (persistence) {
      pendingWrites++;
      state = { ...state, persisting: true };
    }
    publish();
    if (persistence) {
      const snapshot = { sourceVersion: retainedVersion, drafts: state.drafts };
      writes = writes
        .then(async () => {
          await persistence.save(snapshot);
          if (state.storageError) {
            state = { ...state, storageError: false };
            publish();
          }
        })
        .catch(() => {
          state = { ...state, storageError: true };
          publish();
        })
        .finally(() => {
          pendingWrites--;
          state = { ...state, persisting: pendingWrites > 0 };
          publish();
        });
    }
  }
  function admit(drafts: DataAppAnnotationDraft[]) {
    const bytes = drafts.reduce(
      (total, draft) =>
        total + (draft.context.screenshot?.dataUrl.length ?? 0) * 0.75,
      0
    );
    const metadataBytes = new TextEncoder().encode(
      JSON.stringify(
        drafts.map(draft => ({
          ...draft,
          context: { ...draft.context, screenshot: undefined },
        }))
      )
    ).byteLength;
    if (
      drafts.length > 20 ||
      bytes > 4 * 1024 * 1024 ||
      metadataBytes > 120_000
    )
      throw new MessageRoutingError(
        'annotation_limit',
        'Delete an annotation before adding another.'
      );
  }
  function editable() {
    if (!state.ready)
      throw new MessageRoutingError('busy', 'Annotations are still restoring.');
    if (state.outdated)
      throw new MessageRoutingError(
        'invalid_payload',
        'Discard older annotations before collecting feedback for this version.'
      );
  }
  function restore() {
    if (!persistence || state.ready) return Promise.resolve();
    restoring ??= (async () => {
      try {
        const snapshot = await persistence.load();
        if (snapshot) {
          admit(snapshot.drafts);
          retainedVersion = snapshot.sourceVersion;
          state = {
            ...state,
            drafts: snapshot.drafts,
            outdated:
              snapshot.sourceVersion !== sourceVersion &&
              snapshot.drafts.length > 0,
          };
        }
      } catch {
        state = { ...state, storageError: true };
      }
      state = { ...state, ready: true };
      publish();
    })();
    return restoring;
  }
  return {
    getSnapshot: () => state,
    flushPersistence: () => writes,
    subscribe(this: void, listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restore,
    addAnnotation(value: DataAppAnnotationDraft) {
      editable();
      const draft = parseDataAppAnnotationDraft(value);
      if (state.drafts.some(existing => existing.id === draft.id)) return;
      const drafts = [...state.drafts, draft];
      admit(drafts);
      state = { ...state, drafts, deleted: undefined };
      changed();
    },
    updateAnnotation(id: string, comment: string) {
      editable();
      const original = state.drafts.find(draft => draft.id === id);
      if (!original)
        throw new MessageRoutingError(
          'invalid_payload',
          'This annotation is no longer available.'
        );
      const updated = parseDataAppAnnotationDraft({ ...original, comment });
      state = {
        ...state,
        drafts: state.drafts.map(draft => (draft.id === id ? updated : draft)),
      };
      changed();
    },
    deleteAnnotation(id: string) {
      const deleted = state.drafts.find(draft => draft.id === id);
      if (!deleted) return;
      state = {
        ...state,
        deleted,
        drafts: state.drafts.filter(draft => draft.id !== id),
      };
      changed();
    },
    undoDelete(id: string) {
      if (state.deleted?.id !== id) return;
      const drafts = [...state.drafts, state.deleted];
      admit(drafts);
      state = { ...state, drafts, deleted: undefined };
      changed();
    },
    dismissUndo() {
      if (!state.drafts.length) retainedVersion = sourceVersion;
      state = {
        ...state,
        deleted: undefined,
        outdated: state.drafts.length > 0 && state.outdated,
      };
      changed();
    },
    clearAnnotations() {
      retainedVersion = sourceVersion;
      state = { ...state, drafts: [], deleted: undefined, outdated: false };
      changed();
    },
    acknowledgeSubmission(snapshot: readonly DataAppAnnotationDraft[]) {
      const accepted = new Map(
        snapshot.map(draft => [draft.id, JSON.stringify(draft)])
      );
      state = {
        ...state,
        deleted: undefined,
        drafts: state.drafts.filter(
          draft => accepted.get(draft.id) !== JSON.stringify(draft)
        ),
      };
      changed();
    },
  };
}
