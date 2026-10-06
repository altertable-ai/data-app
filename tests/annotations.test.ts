import { createAnnotationClient } from '@altertable/data-app/client';
import { expect, test } from 'bun:test';
import {
  annotationDraftRoute,
  annotationModeRoute,
  annotationEditorStateRoute,
  annotationUpdateRoute,
  parseDataAppAnnotationDraft,
  createMessageRouter,
  MessageRoutingError,
  type DataAppAnnotationDraft,
} from '@altertable/data-app/contract';
import { isDataAppPresentation } from '@/src/core/presentation';
const draft: DataAppAnnotationDraft = {
  id: 'feedback-1',
  target: {
    id: 'revenue',
    label: 'Revenue',
    kind: 'widget',
    text: 'Revenue $42',
    queryNames: ['revenue'],
    glossaryIds: [],
  },
  context: {
    search: '?period=last-7',
    hash: '',
    displayedInput: { period: 'last-30' },
    view: 'stale-error',
    viewport: { width: 1000, height: 800 },
    rect: { x: 10, y: 20, width: 300, height: 200 },
  },
  comment: '  Compare with last year  ',
};
test('annotation boundaries preserve displayed context and discard unexpected fields', () => {
  const parsed = parseDataAppAnnotationDraft({
    ...draft,
    credentials: 'discard',
    target: { ...draft.target, html: 'discard' },
  });
  expect(parsed).toEqual({ ...draft, comment: 'Compare with last year' });
  expect(parsed.context.displayedInput).toEqual({ period: 'last-30' });
});
test('invalid and oversized feedback cannot reach the host handler', async () => {
  let calls = 0;
  const router = createMessageRouter(
    { 'annotation:draft': annotationDraftRoute },
    {
      'annotation:draft'() {
        calls++;
        return null;
      },
    }
  );
  for (const value of [
    null,
    { ...draft, comment: ' ' },
    { ...draft, target: { ...draft.target, kind: 'unknown' } },
    {
      ...draft,
      context: { ...draft.context, displayedInput: 'é'.repeat(6000) },
    },
    {
      ...draft,
      context: {
        ...draft.context,
        rect: { ...draft.context.rect, x: Infinity },
      },
    },
  ]) {
    const failure = await router
      .dispatch(
        { route: 'annotation:draft', payload: value },
        { signal: new AbortController().signal }
      )
      .then(
        () => undefined,
        (error: unknown) => error
      );
    expect(failure).toBeInstanceOf(MessageRoutingError);
  }
  expect(calls).toBe(0);
});
test('hosts explicitly advertise annotation support and bounded pin state', () => {
  expect(isDataAppPresentation({ surface: 'embedded', theme: 'dark' })).toBe(
    true
  );
  expect(
    isDataAppPresentation({
      surface: 'embedded',
      theme: 'dark',
      annotations: {
        enabled: true,
        targets: [{ id: '1', targetId: 'revenue', number: 1 }],
      },
    })
  ).toBe(true);
  expect(
    isDataAppPresentation({
      surface: 'embedded',
      theme: 'dark',
      annotations: {
        enabled: true,
        targets: [{ id: '1', targetId: 'revenue', number: -1 }],
      },
    })
  ).toBe(false);
});

test('shell-controlled annotation mode accepts booleans and rejects invalid mode state', async () => {
  const modes: boolean[] = [];
  const router = createMessageRouter(
    { 'annotation:mode': annotationModeRoute },
    {
      'annotation:mode'({ active }) {
        modes.push(active);
        return null;
      },
    }
  );
  await router.dispatch(
    { route: 'annotation:mode', payload: { active: false } },
    { signal: new AbortController().signal }
  );
  expect(modes).toEqual([false]);
  expect(
    isDataAppPresentation({
      surface: 'embedded',
      theme: 'dark',
      annotations: { enabled: true, active: true },
    })
  ).toBe(true);
  expect(
    isDataAppPresentation({
      surface: 'embedded',
      theme: 'dark',
      annotations: { enabled: true, active: 'yes' },
    })
  ).toBe(false);
  const failure = await router
    .dispatch(
      { route: 'annotation:mode', payload: { active: 'yes' } },
      { signal: new AbortController().signal }
    )
    .catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(MessageRoutingError);
});

test('editing comments is a separate validated mutation from draft admission', async () => {
  const changes: { id: string; comment: string }[] = [];
  const router = createMessageRouter(
    { 'annotation:update': annotationUpdateRoute },
    {
      'annotation:update'(value) {
        changes.push(value);
        return null;
      },
    }
  );
  await router.dispatch(
    {
      route: 'annotation:update',
      payload: {
        id: 'feedback-1',
        comment: '  Compare last quarter  ',
        context: 'ignored',
      },
    },
    { signal: new AbortController().signal }
  );
  expect(changes).toEqual([
    { id: 'feedback-1', comment: 'Compare last quarter' },
  ]);
  for (const comment of ['', ' ', 'x'.repeat(2001)]) {
    const failure = await router
      .dispatch(
        { route: 'annotation:update', payload: { id: 'feedback-1', comment } },
        { signal: new AbortController().signal }
      )
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(MessageRoutingError);
  }
  expect(changes).toHaveLength(1);
});

test('public annotation client delivers validated drafts and edits to the host', async () => {
  const received: unknown[] = [];
  const router = createMessageRouter(
    {
      'annotation:draft': annotationDraftRoute,
      'annotation:update': annotationUpdateRoute,
    },
    {
      'annotation:draft'(value) {
        received.push(value);
        return null;
      },
      'annotation:update'(value) {
        received.push(value);
        return null;
      },
    }
  );
  const client = createAnnotationClient((message, signal) =>
    router.dispatch(message, { signal: signal ?? new AbortController().signal })
  );
  await client.sendAnnotation(draft);
  await client.updateAnnotation(draft.id, 'Compare last quarter');
  expect(received).toEqual([
    { ...draft, comment: draft.comment.trim() },
    { id: draft.id, comment: 'Compare last quarter' },
  ]);
});

test('editor state and display settings preserve canonical pin data', async () => {
  const dirty: boolean[] = [];
  const router = createMessageRouter(
    { 'annotation:editor': annotationEditorStateRoute },
    {
      'annotation:editor'({ hasUnsavedChanges }) {
        dirty.push(hasUnsavedChanges);
        return null;
      },
    }
  );
  const client = createAnnotationClient((message, signal) =>
    router.dispatch(message, { signal: signal ?? new AbortController().signal })
  );
  await client.setEditorState(true);
  await client.setEditorState(false);
  expect(dirty).toEqual([true, false]);
  expect(
    isDataAppPresentation({
      surface: 'embedded',
      theme: 'dark',
      annotations: {
        enabled: true,
        pinsVisible: false,
        showHint: false,
        readOnly: true,
        targets: [
          {
            id: '1',
            targetId: 'revenue',
            number: 1,
            comment: 'Compare last year',
          },
        ],
      },
    })
  ).toBe(true);
  expect(
    isDataAppPresentation({
      surface: 'embedded',
      theme: 'dark',
      annotations: { enabled: true, readOnly: 'yes' },
    })
  ).toBe(false);
});
