import {
  useEffect,
  useEffectEvent,
  useRef,
  useReducer,
  useImperativeHandle,
  type Ref,
  type ComponentRef,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  useMergeRefs,
} from '@floating-ui/react';
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  X,
  Minus,
  LoaderCircle,
} from 'lucide-react';
import type { Theme } from '@/src/core/appearance';
import {
  parseDataAppAnnotationDraft,
  type DataAppAnnotationDraft,
} from '@/src/core/annotations';
import { Button } from '@/src/react/ui/Button';
import { TooltipProvider } from '@/src/react/ui/Tooltip';
import { AnnotationTooltip } from '@/src/react/annotations/AnnotationTooltip';
import { Sheet } from '@/src/react/ui/Sheet';
import { Kbd } from '@/src/react/ui/Kbd';
import { shortcuts } from '@/src/react/ui/shortcuts';

export type AnnotationBarHandle = {
  /** Submit through the same guards, pending state, and retry feedback as the Send button. */
  send: () => Promise<void>;
};

export type AnnotationBarProps = {
  ref?: Ref<AnnotationBarHandle>;
  annotations: readonly DataAppAnnotationDraft[];
  active?: boolean;
  theme?: Theme;
  disabled?: boolean;
  deletedAnnotationId?: string;
  onUndoDelete?: (id: string) => void;
  onDismissUndo?: () => void;
  hasUnsavedChanges?: boolean;
  pinsVisible: boolean;
  onPinsVisibleChange: (visible: boolean) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  /** Let host apps use their existing confirmation dialog. */
  requestDiscard?: (discard: () => void) => void;
  /** Resolve only after the outer application's agent API accepts this snapshot. */
  onSend: (annotations: readonly DataAppAnnotationDraft[]) => Promise<void>;
  onClose: () => void;
};

type AnnotationBarState = {
  position?: { left: number; top: number };
  reviewOpen: boolean;
  pending: boolean;
  error: string;
  discardOpen: boolean;
  previewId?: string;
  observedActive: boolean;
};
type AnnotationBarAction =
  | {
      type: 'positionMoved';
      position: NonNullable<AnnotationBarState['position']>;
    }
  | { type: 'reviewToggled' }
  | { type: 'reviewClosed' }
  | { type: 'previewOpened'; id: string }
  | { type: 'previewClosed' }
  | { type: 'discardDialogChanged'; open: boolean }
  | { type: 'annotationsDiscarded' }
  | { type: 'submissionStarted' }
  | { type: 'submissionAccepted' }
  | { type: 'submissionFailed' }
  | { type: 'submissionFinished' }
  | { type: 'annotationModeObserved'; active: boolean };

function annotationBarReducer(
  state: AnnotationBarState,
  action: AnnotationBarAction
): AnnotationBarState {
  switch (action.type) {
    case 'positionMoved':
      return { ...state, position: action.position };
    case 'reviewToggled':
      return { ...state, reviewOpen: !state.reviewOpen };
    case 'reviewClosed':
      return { ...state, reviewOpen: false };
    case 'previewOpened':
      return { ...state, previewId: action.id };
    case 'previewClosed':
      return { ...state, previewId: undefined };
    case 'discardDialogChanged':
      return { ...state, discardOpen: action.open };
    case 'annotationsDiscarded':
      return { ...state, discardOpen: false, reviewOpen: false };
    case 'submissionStarted':
      return { ...state, pending: true, error: '' };
    case 'submissionAccepted':
      return { ...state, reviewOpen: false };
    case 'submissionFailed':
      return { ...state, error: 'Could not send annotations. Try again.' };
    case 'submissionFinished':
      return { ...state, pending: false };
    case 'annotationModeObserved':
      return {
        ...state,
        observedActive: action.active,
        ...(!action.active ? { reviewOpen: false, previewId: undefined } : {}),
      };
  }
}

/** Host-owned batch controls. Collection changes and agent submission stay with the outer app. */
export function AnnotationBar({
  ref,
  annotations,
  active = true,
  theme = 'light',
  disabled = false,
  deletedAnnotationId,
  onUndoDelete,
  onDismissUndo,
  hasUnsavedChanges = false,
  pinsVisible,
  onPinsVisibleChange,
  onSelect,
  onDelete,
  onClear,
  requestDiscard,
  onSend,
  onClose,
}: AnnotationBarProps) {
  const reviewElement = useRef<ComponentRef<'dialog'>>(null);
  const reviewTrigger = useRef<ComponentRef<'button'>>(null);
  const cancelDiscard = useRef<ComponentRef<'button'>>(null);
  const barRef = useRef<ComponentRef<'div'>>(null);
  const drag = useRef<
    { x: number; y: number; left: number; top: number } | undefined
  >(undefined);
  const submitting = useRef(false);
  const [state, dispatch] = useReducer(annotationBarReducer, {
    reviewOpen: false,
    pending: false,
    error: '',
    discardOpen: false,
    observedActive: active,
  });
  const { position, reviewOpen, pending, error, discardOpen, previewId } =
    state;
  const preview = annotations.find(annotation => annotation.id === previewId);
  const locked = disabled || pending;
  const canSend =
    active && !locked && !hasUnsavedChanges && annotations.length > 0;
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(10), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  const barElementRef = useMergeRefs([refs.setReference, barRef]);
  const reviewRef = useMergeRefs([refs.setFloating, reviewElement]);

  function move(left: number, top: number) {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    dispatch({
      type: 'positionMoved',
      position: {
        left: Math.max(12, Math.min(left, window.innerWidth - rect.width - 12)),
        top: Math.max(12, Math.min(top, window.innerHeight - rect.height - 12)),
      },
    });
  }
  const keepInViewport = useEffectEvent(() => {
    if (position) move(position.left, position.top);
  });
  useEffect(() => {
    window.addEventListener('resize', keepInViewport);
    return () => window.removeEventListener('resize', keepInViewport);
  }, []);
  useEffect(() => {
    if (reviewOpen)
      reviewElement.current
        ?.querySelector<ComponentRef<'button'>>('button')
        ?.focus();
  }, [reviewOpen]);
  if (state.observedActive !== active)
    dispatch({ type: 'annotationModeObserved', active });
  function closeReview() {
    dispatch({ type: 'reviewClosed' });
    reviewTrigger.current?.focus();
  }
  async function send() {
    if (submitting.current || !canSend) return;
    submitting.current = true;
    dispatch({ type: 'submissionStarted' });
    try {
      const snapshot = annotations.map(parseDataAppAnnotationDraft);
      await onSend(snapshot);
      dispatch({ type: 'submissionAccepted' });
    } catch {
      dispatch({ type: 'submissionFailed' });
    } finally {
      submitting.current = false;
      dispatch({ type: 'submissionFinished' });
    }
  }
  useImperativeHandle(ref, () => ({ send }));
  useEffect(() => {
    if (discardOpen) cancelDiscard.current?.focus();
  }, [discardOpen]);
  function discardAnnotations() {
    dispatch({ type: 'annotationsDiscarded' });
    onClear();
    onClose();
  }
  const undo =
    deletedAnnotationId && onUndoDelete ? (
      <div
        className="altertable-annotation-undo"
        data-theme={theme}
        data-inline={
          (active && reviewOpen && annotations.length > 0) || undefined
        }
        data-bar-visible={(active && annotations.length > 0) || undefined}
      >
        <output>Annotation deleted</output>
        <Button
          variant="ghost"
          onClick={() => onUndoDelete(deletedAnnotationId)}
        >
          Undo
        </Button>
        {onDismissUndo && (
          <Button
            variant="ghost"
            size="icon-compact"
            aria-label="Dismiss deleted annotation"
            onClick={onDismissUndo}
          >
            <X size={14} aria-hidden />
          </Button>
        )}
      </div>
    ) : null;
  if (annotations.length === 0 && !deletedAnnotationId) return null;
  const style: CSSProperties = position
    ? {
        left: position.left,
        top: position.top,
        bottom: 'auto',
        transform: 'none',
      }
    : {};

  return (
    <TooltipProvider>
      {active && annotations.length > 0 && (
        <div
          ref={barElementRef}
          className="altertable-annotation-bar"
          data-theme={theme}
          style={style}
          tabIndex={-1}
          role="toolbar"
          aria-label="Annotations"
          onKeyDown={event => {
            if (event.key !== 'Escape' || locked || hasUnsavedChanges) return;
            event.preventDefault();
            if (reviewOpen) closeReview();
            else onClose();
          }}
        >
          <Button
            variant="ghost"
            size="icon-compact"
            aria-label="Move annotation bar"
            data-atbl-internal-drag-handle
            disabled={locked}
            onPointerDown={event => {
              const rect = barRef.current?.getBoundingClientRect();
              if (!rect) return;
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                left: rect.left,
                top: rect.top,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
              const origin = drag.current;
              if (origin)
                move(
                  origin.left + event.clientX - origin.x,
                  origin.top + event.clientY - origin.y
                );
            }}
            onPointerUp={() => {
              drag.current = undefined;
            }}
            onPointerCancel={() => {
              drag.current = undefined;
            }}
            onKeyDown={event => {
              const delta = {
                ArrowLeft: [-10, 0],
                ArrowRight: [10, 0],
                ArrowUp: [0, -10],
                ArrowDown: [0, 10],
              }[event.key];
              const rect = barRef.current?.getBoundingClientRect();
              if (!delta || !rect) return;
              event.preventDefault();
              move(rect.left + delta[0]!, rect.top + delta[1]!);
            }}
          >
            <GripVertical size={16} aria-hidden />
          </Button>
          <Button
            ref={reviewTrigger}
            className="altertable-annotation-bar-count"
            variant="ghost"
            size="compact"
            aria-label="Review annotations"
            aria-expanded={reviewOpen && annotations.length > 0}
            aria-haspopup="dialog"
            disabled={locked || !annotations.length}
            onClick={() => dispatch({ type: 'reviewToggled' })}
          >
            Annotating · {annotations.length}
          </Button>
          <AnnotationTooltip
            content={
              pinsVisible ? 'Hide annotation pins' : 'Show annotation pins'
            }
            theme={theme}
          >
            <Button
              variant="ghost"
              size="icon-compact"
              aria-label={
                pinsVisible ? 'Hide annotation pins' : 'Show annotation pins'
              }
              aria-pressed={!pinsVisible}
              disabled={locked}
              onClick={() => onPinsVisibleChange(!pinsVisible)}
            >
              {pinsVisible ? (
                <EyeOff size={16} aria-hidden />
              ) : (
                <Eye size={16} aria-hidden />
              )}
            </Button>
          </AnnotationTooltip>
          <AnnotationTooltip content="Discard all annotations" theme={theme}>
            <Button
              variant="ghost"
              size="icon-compact"
              aria-label="Discard all annotations"
              disabled={locked}
              onClick={() =>
                requestDiscard
                  ? requestDiscard(discardAnnotations)
                  : dispatch({ type: 'discardDialogChanged', open: true })
              }
            >
              <Trash2 size={16} aria-hidden />
            </Button>
          </AnnotationTooltip>
          <AnnotationTooltip
            content={
              hasUnsavedChanges ? (
                'Save the open annotation before sending'
              ) : (
                <>
                  Send annotations <Kbd shortcut={shortcuts.sendAnnotations} />
                </>
              )
            }
            theme={theme}
          >
            <Button
              className="altertable-annotation-bar-send"
              data-pending={pending || undefined}
              aria-busy={pending}
              size="compact"
              aria-label="Send annotations"
              disabled={!canSend}
              onClick={() => void send()}
            >
              <span className="altertable-annotation-bar-send-label">Send</span>
              {pending && (
                <LoaderCircle
                  className="altertable-annotation-bar-spinner"
                  size={16}
                  aria-hidden
                />
              )}
            </Button>
          </AnnotationTooltip>
          <AnnotationTooltip
            content={
              <>
                {hasUnsavedChanges
                  ? 'Save or discard the open annotation first'
                  : 'Exit annotation mode'}{' '}
                <Kbd>Esc</Kbd>
              </>
            }
            theme={theme}
          >
            <Button
              variant="ghost"
              size="icon-compact"
              aria-label="Exit annotation mode"
              disabled={locked || hasUnsavedChanges}
              onClick={onClose}
            >
              <X size={16} aria-hidden />
            </Button>
          </AnnotationTooltip>
          {error && (
            <output className="altertable-annotation-bar-error" role="alert">
              {error}
            </output>
          )}
        </div>
      )}
      {(!active || !reviewOpen || annotations.length === 0) &&
        undo &&
        createPortal(undo, document.body)}
      {active &&
        reviewOpen &&
        annotations.length > 0 &&
        createPortal(
          <dialog
            open
            ref={reviewRef}
            className="altertable-annotation-bar-panel"
            data-theme={theme}
            style={floatingStyles}
            aria-label="Review annotations"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeReview();
              }
            }}
          >
            <header>
              <strong>Annotations</strong>
              <Button
                variant="ghost"
                size="icon-compact"
                aria-label="Minimize annotation review"
                onClick={closeReview}
              >
                <Minus size={16} aria-hidden />
              </Button>
            </header>
            <div aria-label="Annotation drafts">
              {annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className="altertable-annotation-bar-row"
                >
                  {annotation.context.screenshot && (
                    <button
                      data-atbl-focus="ring"
                      data-atbl-control="action"
                      type="button"
                      className="altertable-annotation-thumbnail"
                      aria-label={`View screenshot of ${annotation.target.label}`}
                      onClick={() =>
                        dispatch({ type: 'previewOpened', id: annotation.id })
                      }
                    >
                      <img src={annotation.context.screenshot.dataUrl} alt="" />
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    className="altertable-annotation-bar-open"
                    aria-label={`Open annotation ${index + 1}`}
                    disabled={locked}
                    onClick={() => {
                      onPinsVisibleChange(true);
                      onSelect(annotation.id);
                      dispatch({ type: 'reviewClosed' });
                    }}
                  >
                    <strong>{annotation.target.label}</strong>
                    <span>{annotation.comment}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-compact"
                    aria-label={`Delete annotation ${index + 1}`}
                    disabled={locked}
                    onClick={() => onDelete(annotation.id)}
                  >
                    <Trash2 size={16} aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
            {undo}
          </dialog>,
          document.body
        )}
      <Sheet
        open={Boolean(preview)}
        onOpenChange={open => {
          if (!open) dispatch({ type: 'previewClosed' });
        }}
        placement="center"
        className="altertable-annotation-image-dialog"
        title={preview?.target.label ?? 'Screenshot'}
        description={preview?.comment}
        returnFocus={reviewTrigger}
      >
        {preview?.context.screenshot && (
          <img
            className="altertable-annotation-preview"
            src={preview.context.screenshot.dataUrl}
            alt={`Captured area for ${preview.target.label}`}
          />
        )}
      </Sheet>
      {!requestDiscard && (
        <Sheet
          open={discardOpen}
          onOpenChange={open =>
            dispatch({ type: 'discardDialogChanged', open })
          }
          placement="center"
          title="Discard all pending annotations?"
          returnFocus={barRef}
          footer={
            <>
              <Button
                ref={cancelDiscard}
                variant="ghost"
                onClick={() =>
                  dispatch({ type: 'discardDialogChanged', open: false })
                }
              >
                Cancel
              </Button>
              <Button
                className="altertable-annotation-discard-confirm"
                disabled={locked}
                onClick={discardAnnotations}
              >
                Discard
              </Button>
            </>
          }
        >
          <p className="altertable-annotation-discard-description">
            These annotations will be removed and won’t be sent to the agent.
          </p>
        </Sheet>
      )}
    </TooltipProvider>
  );
}
