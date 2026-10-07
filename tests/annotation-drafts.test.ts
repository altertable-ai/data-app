import { expect, test } from 'bun:test';
import { createAnnotationDraftStore } from '@/src/react/annotation-drafts';
import type { DataAppAnnotationDraft } from '@/src/core/annotations';

const draft: DataAppAnnotationDraft = {
  id: 'one',
  target: {
    id: 'revenue',
    label: 'Revenue',
    kind: 'widget',
    text: '42',
    queryNames: [],
    glossaryIds: [],
  },
  comment: 'Compare last year',
  context: {
    search: '',
    hash: '',
    viewport: { width: 600, height: 400 },
    rect: { x: 0, y: 0, width: 200, height: 100 },
  },
};

test('host collection acknowledges only unchanged submitted snapshots and supports deletion undo', () => {
  const store = createAnnotationDraftStore('version-1');
  store.addAnnotation(draft);
  store.addAnnotation({ ...draft, comment: 'Retried request' });
  expect(store.getSnapshot().drafts[0].comment).toBe(draft.comment);
  store.updateAnnotation(draft.id, 'New edit');
  store.acknowledgeSubmission([draft]);
  expect(store.getSnapshot().drafts).toHaveLength(1);
  store.deleteAnnotation(draft.id);
  expect(store.getSnapshot().drafts).toHaveLength(0);
  store.undoDelete(draft.id);
  expect(store.getSnapshot().drafts[0].comment).toBe('New edit');
  store.acknowledgeSubmission(store.getSnapshot().drafts);
  expect(store.getSnapshot().drafts).toHaveLength(0);
});

test('restore calls share hydration and discard older app-version batches', async () => {
  let loads = 0;
  let resolve!: (value: {
    sourceVersion: string;
    drafts: DataAppAnnotationDraft[];
  }) => void;
  const deferred = new Promise<{
    sourceVersion: string;
    drafts: DataAppAnnotationDraft[];
  }>(done => {
    resolve = done;
  });
  const saved: { sourceVersion: string; drafts: DataAppAnnotationDraft[] }[] =
    [];
  const store = createAnnotationDraftStore('version-2', {
    load: () => {
      loads++;
      return deferred;
    },
    save: async snapshot => {
      saved.push(snapshot);
    },
  });
  const first = store.restore();
  const second = store.restore();
  expect(loads).toBe(1);
  expect(() => store.addAnnotation(draft)).toThrow('still restoring');
  resolve({ sourceVersion: 'version-1', drafts: [draft] });
  await Promise.all([first, second]);
  expect(store.getSnapshot().drafts).toEqual([]);
  expect(store.getSnapshot().deleted).toBeUndefined();
  expect(saved).toEqual([{ sourceVersion: 'version-2', drafts: [] }]);
  store.addAnnotation({ ...draft, id: 'new' });
  expect(store.getSnapshot().drafts).toHaveLength(1);
});

test('local writes stay ordered, recover from storage failure, and expose durability', async () => {
  const comments: string[] = [];
  const store = createAnnotationDraftStore('version-1', {
    load: async () => undefined,
    save: async snapshot => {
      comments.push(snapshot.drafts[0]?.comment ?? 'empty');
      if (comments.length === 1) throw new Error('Storage unavailable');
    },
  });
  await store.restore();
  store.addAnnotation(draft);
  store.updateAnnotation(draft.id, 'Latest edit');
  expect(store.getSnapshot().persisting).toBe(true);
  await store.flushPersistence();
  expect(comments).toEqual(['Compare last year', 'Latest edit']);
  expect(store.getSnapshot().storageError).toBe(false);
  expect(store.getSnapshot().persisting).toBe(false);
  expect(store.getSnapshot().drafts[0].comment).toBe('Latest edit');
});
