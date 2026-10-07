import { expect, test } from 'bun:test';
import {
  annotationControlsReducer,
  createAnnotationControlsState,
  type AnnotationEditorState,
} from '@/src/react/ui/annotation-editor-state';

const editor: AnnotationEditorState = {
  target: {
    id: 'revenue',
    label: 'Revenue',
    kind: 'widget',
    element: {} as HTMLElement,
  },
  draft: {
    id: 'capture-one',
    target: {
      id: 'revenue',
      label: 'Revenue',
      kind: 'widget',
      text: '42',
      queryNames: [],
      glossaryIds: [],
    },
    context: {
      search: '',
      hash: '',
      viewport: { width: 600, height: 400 },
      rect: { x: 0, y: 0, width: 200, height: 100 },
    },
    comment: '',
  },
  comment: 'Compare last year',
  captureStatus: 'capturing',
  error: '',
  discardArmed: false,
  shaking: false,
};

test('consecutive Escape actions discard only the dirty editor and keep annotation mode active', () => {
  let state = annotationControlsReducer(createAnnotationControlsState(true), {
    type: 'editorOpened',
    editor,
  });
  state = annotationControlsReducer(state, {
    type: 'editorEscaped',
    hasUnsavedChanges: true,
  });
  expect(state.editor?.shaking).toBe(true);
  expect(state.editor?.comment).toBe(editor.comment);
  state = annotationControlsReducer(state, {
    type: 'editorEscaped',
    hasUnsavedChanges: true,
  });
  expect(state.editor).toBeUndefined();
  expect(state.annotationModeActive).toBe(true);
});

test('editing after a discard prompt requires a new confirmation; saved comments close immediately', () => {
  let state = annotationControlsReducer(createAnnotationControlsState(true), {
    type: 'editorOpened',
    editor,
  });
  state = annotationControlsReducer(state, {
    type: 'editorEscaped',
    hasUnsavedChanges: true,
  });
  state = annotationControlsReducer(state, {
    type: 'commentChanged',
    comment: 'Show weekly totals',
  });
  state = annotationControlsReducer(state, {
    type: 'editorEscaped',
    hasUnsavedChanges: true,
  });
  expect(state.editor?.comment).toBe('Show weekly totals');
  expect(state.editor?.shaking).toBe(true);
  state = annotationControlsReducer(state, {
    type: 'editorEscaped',
    hasUnsavedChanges: false,
  });
  expect(state.editor).toBeUndefined();
});

test('a late screenshot result cannot change a newer selection or reopen a closed editor', () => {
  let state = annotationControlsReducer(createAnnotationControlsState(true), {
    type: 'editorOpened',
    editor,
  });
  state = annotationControlsReducer(state, {
    type: 'editorOpened',
    editor: { ...editor, draft: { ...editor.draft, id: 'capture-two' } },
  });
  state = annotationControlsReducer(state, {
    type: 'captureCompleted',
    draftId: 'capture-one',
    succeeded: false,
  });
  expect(state.editor?.captureStatus).toBe('capturing');
  state = annotationControlsReducer(state, {
    type: 'externalModeObserved',
    active: false,
  });
  state = annotationControlsReducer(state, {
    type: 'captureCompleted',
    draftId: 'capture-two',
    succeeded: true,
  });
  expect(state.editor).toBeUndefined();
});
