import type { DataAppAnnotationDraft } from '@/src/core/annotations';
import type { AnnotationTargetElement } from '@/src/react/annotations/annotation-targets';

export type AnnotationEditorState = {
  target: AnnotationTargetElement;
  draft: DataAppAnnotationDraft;
  annotationId?: string;
  comment: string;
  captureStatus: 'capturing' | 'ready' | 'failed';
  error: string;
  discardArmed: boolean;
  shaking: boolean;
};

type AnnotationControlsState = {
  annotationModeActive: boolean;
  observedActive: boolean;
  hoveredTarget?: AnnotationTargetElement;
  editor?: AnnotationEditorState;
  saving: boolean;
};

type AnnotationControlsAction =
  | { type: 'annotationModeChanged'; active: boolean }
  | { type: 'externalModeObserved'; active: boolean }
  | { type: 'targetHovered'; target?: AnnotationTargetElement }
  | { type: 'editorOpened'; editor: AnnotationEditorState }
  | { type: 'editorClosed' }
  | { type: 'commentChanged'; comment: string }
  | { type: 'captureCompleted'; draftId: string; succeeded: boolean }
  | { type: 'editorEscaped'; hasUnsavedChanges: boolean }
  | { type: 'shakeFinished' }
  | { type: 'saveStarted' }
  | { type: 'saveFailed'; error: string }
  | { type: 'saveFinished' };

export function createAnnotationControlsState(
  active: boolean
): AnnotationControlsState {
  return {
    annotationModeActive: active,
    observedActive: active,
    saving: false,
  };
}

export function annotationControlsReducer(
  state: AnnotationControlsState,
  action: AnnotationControlsAction
): AnnotationControlsState {
  switch (action.type) {
    case 'annotationModeChanged':
      return {
        ...state,
        annotationModeActive: action.active,
        ...(!action.active
          ? { editor: undefined, hoveredTarget: undefined }
          : {}),
      };
    case 'externalModeObserved':
      return {
        ...state,
        observedActive: action.active,
        ...(!action.active
          ? { editor: undefined, hoveredTarget: undefined }
          : {}),
      };
    case 'targetHovered':
      return { ...state, hoveredTarget: action.target };
    case 'editorOpened':
      return { ...state, editor: action.editor, hoveredTarget: undefined };
    case 'editorClosed':
      return { ...state, editor: undefined };
    case 'saveStarted':
      return {
        ...state,
        saving: true,
        editor: state.editor ? { ...state.editor, error: '' } : undefined,
      };
    case 'saveFinished':
      return { ...state, saving: false };
  }
  const editor = state.editor;
  if (!editor) return state;
  switch (action.type) {
    case 'commentChanged':
      return {
        ...state,
        editor: {
          ...editor,
          comment: action.comment,
          discardArmed: false,
          shaking: false,
        },
      };
    case 'captureCompleted':
      return editor.draft.id === action.draftId
        ? {
            ...state,
            editor: {
              ...editor,
              captureStatus: action.succeeded ? 'ready' : 'failed',
            },
          }
        : state;
    case 'editorEscaped':
      return action.hasUnsavedChanges && !editor.discardArmed
        ? { ...state, editor: { ...editor, discardArmed: true, shaking: true } }
        : { ...state, editor: undefined };
    case 'shakeFinished':
      return { ...state, editor: { ...editor, shaking: false } };
    case 'saveFailed':
      return { ...state, editor: { ...editor, error: action.error } };
  }
}
