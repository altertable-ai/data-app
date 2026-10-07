import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
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
  LoaderCircle,
} from 'lucide-react';
import type { Theme } from '@/src/core/appearance';
import {
  parseDataAppAnnotationDraft,
  type DataAppAnnotationDraft,
} from '@/src/core/annotations';
import { Button } from '@/src/react/ui/Button';
import { Tooltip, TooltipProvider } from '@/src/react/ui/Tooltip';
import { Sheet } from '@/src/react/ui/Sheet';
import { Kbd } from '@/src/react/ui/Kbd';

export type AnnotationBarProps = {
  annotations: readonly DataAppAnnotationDraft[];
  active?: boolean;
  theme?: Theme;
  disabled?: boolean;
  outdated?: boolean;
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

/** Host-owned batch controls. Collection changes and agent submission stay with the outer app. */
export function AnnotationBar({
  annotations,
  active = true,
  theme = 'light',
  disabled = false,
  outdated = false,
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
  const reviewElement = useRef<HTMLDialogElement>(null);
  const reviewTrigger = useRef<HTMLButtonElement>(null);
  const cancelDiscard = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef<
    { x: number; y: number; left: number; top: number } | undefined
  >(undefined);
  const submitting = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string>();
  const preview = annotations.find(annotation => annotation.id === previewId);
  const tooltipProps = {
    className: 'altertable-annotation-bar-tooltip',
    'data-theme': theme,
  };
  const locked = disabled || pending;
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
    setPosition({
      left: Math.max(12, Math.min(left, window.innerWidth - rect.width - 12)),
      top: Math.max(12, Math.min(top, window.innerHeight - rect.height - 12)),
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
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus();
  }, [reviewOpen]);
  const [lastActive, setLastActive] = useState(active);
  if (lastActive !== active) {
    setLastActive(active);
    if (!active) {
      setReviewOpen(false);
      setPreviewId(undefined);
    }
  }
  function closeReview() {
    setReviewOpen(false);
    reviewTrigger.current?.focus();
  }
  async function send() {
    if (
      submitting.current ||
      locked ||
      hasUnsavedChanges ||
      outdated ||
      !annotations.length
    )
      return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      const snapshot = annotations.map(parseDataAppAnnotationDraft);
      await onSend(snapshot);
      setReviewOpen(false);
    } catch {
      setError('Could not send annotations. Try again.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  useEffect(() => {
    if (discardOpen) cancelDiscard.current?.focus();
  }, [discardOpen]);
  function discardAnnotations() {
    setDiscardOpen(false);
    setReviewOpen(false);
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
            onClick={() => setReviewOpen(value => !value)}
          >
            Annotating · {annotations.length}
          </Button>
          <Tooltip
            content={
              pinsVisible ? 'Hide annotation pins' : 'Show annotation pins'
            }
            tooltipProps={tooltipProps}
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
          </Tooltip>
          <Tooltip
            content="Discard all annotations"
            tooltipProps={tooltipProps}
          >
            <Button
              variant="ghost"
              size="icon-compact"
              aria-label="Discard all annotations"
              disabled={locked}
              onClick={() =>
                requestDiscard
                  ? requestDiscard(discardAnnotations)
                  : setDiscardOpen(true)
              }
            >
              <Trash2 size={16} aria-hidden />
            </Button>
          </Tooltip>
          <Tooltip
            content={
              outdated
                ? 'Discard annotations from the earlier app version before sending'
                : hasUnsavedChanges
                  ? 'Save the open annotation before sending'
                  : 'Send annotations'
            }
            tooltipProps={tooltipProps}
          >
            <Button
              className="altertable-annotation-bar-send"
              data-pending={pending || undefined}
              aria-busy={pending}
              size="compact"
              aria-label="Send annotations"
              disabled={
                locked || hasUnsavedChanges || outdated || !annotations.length
              }
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
          </Tooltip>
          <Tooltip
            content={
              <>
                {hasUnsavedChanges
                  ? 'Save or discard the open annotation first'
                  : 'Exit annotation mode'}{' '}
                <Kbd>Esc</Kbd>
              </>
            }
            tooltipProps={tooltipProps}
          >
            <Button
              variant="ghost"
              size="icon-compact"
              aria-label="Exit annotation mode"
              disabled={locked || hasUnsavedChanges || outdated}
              onClick={onClose}
            >
              <X size={16} aria-hidden />
            </Button>
          </Tooltip>
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
                aria-label="Close annotation review"
                onClick={closeReview}
              >
                <X size={16} aria-hidden />
              </Button>
            </header>
            {outdated && (
              <output className="altertable-annotation-outdated">
                From an earlier app version. Review the screenshots or discard
                these annotations before collecting new feedback.
              </output>
            )}
            <div aria-label="Annotation drafts">
              {annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className="altertable-annotation-bar-row"
                >
                  {annotation.context.screenshot && (
                    <button
                      type="button"
                      className="altertable-annotation-thumbnail"
                      aria-label={`View screenshot of ${annotation.target.label}`}
                      onClick={() => setPreviewId(annotation.id)}
                    >
                      <img src={annotation.context.screenshot.dataUrl} alt="" />
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    className="altertable-annotation-bar-open"
                    aria-label={`Open annotation ${index + 1}`}
                    disabled={locked || outdated}
                    onClick={() => {
                      onPinsVisibleChange(true);
                      onSelect(annotation.id);
                      setReviewOpen(false);
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
          if (!open) setPreviewId(undefined);
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
          onOpenChange={setDiscardOpen}
          placement="center"
          title="Discard all pending annotations?"
          returnFocus={barRef}
          footer={
            <>
              <Button
                ref={cancelDiscard}
                variant="ghost"
                onClick={() => setDiscardOpen(false)}
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
