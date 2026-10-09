import { randomUuid } from '@/src/core/uuid';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useMemo,
  useReducer,
  type ComponentRef,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import { MessageRoutingError } from '@/src/core/messages';
import { DataAppError } from '@/src/client/transport';
import { getDataAppNavigation } from '@/src/client/navigation';
import type {
  DataAppAnnotationDraft,
  DataAppAnnotationPresentation,
} from '@/src/core/annotations';
import { useDataAppAnnotations } from '@/src/react/annotations/useDataAppAnnotations';
import {
  findAnnotationTarget,
  normalizeAnnotationRect,
  projectAnnotationRect,
  annotationGeometry,
  annotationPoint,
  type AnnotationRect,
  type AnnotationTargetElement,
  type AnnotationPoint,
} from '@/src/react/annotations/annotation-targets';
import { captureAnnotationScreenshot } from '@/src/react/annotations/annotation-screenshot';
import { AnnotationSelectionLayer } from '@/src/react/annotations/AnnotationSelectionLayer';
import { AnnotationTrigger } from '@/src/react/annotations/AnnotationTrigger';
import { AnnotationEditor } from '@/src/react/annotations/AnnotationEditor';
import { AnnotationMarkers } from '@/src/react/annotations/AnnotationMarkers';
import {
  useAnnotationTargets,
  useAnnotationGeometry,
} from '@/src/react/annotations/useAnnotationGeometry';
import {
  annotationControlsReducer,
  createAnnotationControlsState,
} from '@/src/react/annotations/annotation-editor-state';
import { shortcuts, useShortcut } from '@/src/react/ui/shortcuts';

type AnnotationControlsProps = {
  rootRef: RefObject<ComponentRef<'div'> | null>;
  presentation: DataAppAnnotationPresentation;
  displayedInput?: unknown;
  view?: string;
};
type AnnotationSelection = {
  target: AnnotationTargetElement;
  cursor?: AnnotationPoint;
  region?: AnnotationRect;
  annotation?: NonNullable<DataAppAnnotationPresentation['targets']>[number];
  comment?: string;
};
type AnnotationScreenshot = NonNullable<
  DataAppAnnotationDraft['context']['screenshot']
>;
type ScreenshotCapture = {
  draftId: string;
  result: Promise<AnnotationScreenshot | undefined>;
};

export function AnnotationControls({
  rootRef,
  presentation,
  displayedInput,
  view,
}: AnnotationControlsProps) {
  const annotationClient = useDataAppAnnotations();
  const [state, dispatch] = useReducer(
    annotationControlsReducer,
    presentation.active ?? false,
    createAnnotationControlsState
  );
  const { editor, hoveredTarget, saving } = state;
  const active = presentation.active ?? state.annotationModeActive;
  const pending = saving || presentation.readOnly === true;
  const editing = Boolean(editor);
  const editorDraftId = editor?.draft.id;
  const selectedTarget = editor?.target;
  const anchor = editor?.draft.context.anchor;
  const savedComment =
    presentation.targets?.find(pin => pin.id === editor?.annotationId)
      ?.comment ?? '';
  const hasUnsavedChanges = Boolean(editor) && editor?.comment !== savedComment;
  const screenshot = useRef<ScreenshotCapture | undefined>(undefined);
  const toolbarRef = useRef<ComponentRef<'button'>>(null);
  const textareaRef = useRef<ComponentRef<'textarea'>>(null);
  const discovery = useAnnotationTargets(rootRef, active);
  const geometry = useAnnotationGeometry({
    rootRef,
    target: editor?.target ?? hoveredTarget,
    region: editor?.draft.context.region,
    targets: presentation.targets,
  });
  if (state.observedActive !== active)
    dispatch({ type: 'externalModeObserved', active });
  if (
    editor?.annotationId &&
    !presentation.targets?.some(pin => pin.id === editor.annotationId)
  ) {
    dispatch({ type: 'editorClosed' });
  }

  useEffect(() => {
    void annotationClient
      .reportAnnotationEditorState({ hasUnsavedChanges })
      .catch(() => {});
  }, [annotationClient, hasUnsavedChanges]);
  useEffect(() => {
    if (editorDraftId) textareaRef.current?.focus();
    else screenshot.current = undefined;
  }, [editorDraftId, active]);

  const reference = useMemo(() => {
    if (!selectedTarget || !anchor) return selectedTarget?.element;
    return {
      contextElement: selectedTarget.element,
      getBoundingClientRect() {
        const rect = annotationGeometry(selectedTarget.element);
        return new DOMRect(
          rect.x + rect.width * anchor.x,
          rect.y + rect.height * anchor.y,
          0,
          0
        );
      },
    };
  }, [selectedTarget, anchor]);
  const { refs, floatingStyles } = useFloating({
    placement: 'right-start',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 12, crossAxis: true })],
    whileElementsMounted: autoUpdate,
  });
  useEffect(() => {
    refs.setPositionReference(reference ?? null);
  }, [refs, reference]);

  const dismissFromPointer = useEffectEvent((event: PointerEvent) => {
    if (!editor || pending) return false;
    const editorElement = refs.floating.current;
    if (editorElement && event.composedPath().includes(editorElement))
      return false;
    if (event.pointerType !== 'touch') event.preventDefault();
    event.stopImmediatePropagation();
    dispatch({ type: 'editorClosed' });
    return true;
  });
  useEffect(() => {
    if (!active) return;
    let dismissed = false;
    function dismissOutside(event: PointerEvent) {
      dismissed = dismissFromPointer(event);
    }
    function consumeClick(event: MouseEvent) {
      if (!dismissed) return;
      dismissed = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    function cancelPointer() {
      dismissed = false;
    }
    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('click', consumeClick, true);
    document.addEventListener('pointercancel', cancelPointer, true);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('click', consumeClick, true);
      document.removeEventListener('pointercancel', cancelPointer, true);
    };
  }, [active]);
  useEffect(() => {
    if (!editing || pending) return;
    function dismissOnBlur() {
      dispatch({ type: 'editorClosed' });
    }
    // Parent-frame clicks do not propagate into the iframe document.
    window.addEventListener('blur', dismissOnBlur);
    return () => window.removeEventListener('blur', dismissOnBlur);
  }, [editing, pending]);

  function openEditor({
    target,
    cursor,
    region,
    annotation,
    comment,
  }: AnnotationSelection) {
    const location = getDataAppNavigation()?.snapshot();
    const rect = annotationGeometry(target.element);
    const point = annotationPoint(rect, cursor);
    const draft: DataAppAnnotationDraft = {
      id: randomUuid(),
      target: {
        id: target.id,
        label: region ? 'Selected area' : target.label.slice(0, 256),
        kind: target.kind,
        text: (target.element.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 1024),
        queryNames: JSON.parse(
          target.element.dataset.annotationQueries ?? '[]'
        ) as string[],
        glossaryIds: JSON.parse(
          target.element.dataset.annotationGlossary ?? '[]'
        ) as string[],
      },
      context: {
        ...point,
        ...(region ? { region: normalizeAnnotationRect(region, rect) } : {}),
        search: (location?.search ?? window.location.search).slice(0, 2048),
        hash: (location?.hash ?? window.location.hash).slice(0, 1024),
        displayedInput:
          displayedInput === undefined
            ? undefined
            : (JSON.parse(JSON.stringify(displayedInput)) as unknown),
        view:
          target.element
            .querySelector('[role=tab][aria-selected=true]')
            ?.textContent?.slice(0, 128) ?? view,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        rect: region ?? rect,
      },
      comment: '',
    };
    dispatch({
      type: 'editorOpened',
      editor: {
        target,
        draft,
        annotationId: annotation?.id,
        comment: comment ?? annotation?.comment ?? '',
        captureStatus: annotation ? 'ready' : 'capturing',
        error: '',
        discardArmed: false,
        shaking: false,
      },
    });
    screenshot.current = annotation
      ? undefined
      : {
          draftId: draft.id,
          result: captureAnnotationScreenshot(target.element, region).then(
            image => {
              dispatch({
                type: 'captureCompleted',
                draftId: draft.id,
                succeeded: true,
              });
              return image;
            },
            () => {
              dispatch({
                type: 'captureCompleted',
                draftId: draft.id,
                succeeded: false,
              });
              return undefined;
            }
          ),
        };
  }

  function setAnnotationMode(active: boolean) {
    dispatch({ type: 'annotationModeChanged', active });
    if (presentation.active !== undefined) {
      void annotationClient
        .requestAnnotationModeChange({ active })
        .catch(() => {});
    }
  }
  function closeAnnotationMode() {
    screenshot.current = undefined;
    setAnnotationMode(false);
    toolbarRef.current?.focus();
  }
  function toggleAnnotationMode() {
    if (active) closeAnnotationMode();
    else setAnnotationMode(true);
  }
  useShortcut(shortcuts.annotate, toggleAnnotationMode, !pending, true);

  function openAnnotation(id: string) {
    const annotation = presentation.targets?.find(pin => pin.id === id);
    const target = findAnnotationTarget(rootRef.current, annotation?.targetId);
    if (!annotation || !target || pending) return;
    setAnnotationMode(true);
    const rect = annotationGeometry(target.element);
    const cursor = annotation.anchor
      ? {
          x: rect.x + rect.width * annotation.anchor.x,
          y: rect.y + rect.height * annotation.anchor.y,
        }
      : undefined;
    const pointY = cursor?.y ?? rect.y + rect.height / 2;
    if (pointY < 0 || pointY > window.innerHeight) {
      window.scrollBy({
        top: pointY - window.innerHeight / 2,
        behavior: 'smooth',
      });
    }
    openEditor({
      target,
      cursor,
      annotation,
      region: annotation.region
        ? projectAnnotationRect(annotation.region, rect)
        : undefined,
    });
  }
  function retryScreenshot() {
    if (!editor || pending) return;
    const rect = annotationGeometry(editor.target.element);
    const { anchor, region } = editor.draft.context;
    openEditor({
      target: editor.target,
      comment: editor.comment,
      cursor: anchor
        ? {
            x: rect.x + rect.width * anchor.x,
            y: rect.y + rect.height * anchor.y,
          }
        : undefined,
      region: region ? projectAnnotationRect(region, rect) : undefined,
    });
  }
  const openFromHost = useEffectEvent(openAnnotation);
  const selectFromLayer = useEffectEvent(openEditor);
  const escapeFromKeyboard = useEffectEvent(() => {
    if (editor) dispatch({ type: 'editorEscaped', hasUnsavedChanges });
    else closeAnnotationMode();
  });
  useEffect(() => {
    if (!active) return;
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || (pending && editing)) return;
      if (
        document.querySelector('dialog[open], [data-selecting]') ||
        event.isComposing
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) escapeFromKeyboard();
    }
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [active, pending, editing]);
  useEffect(() => {
    if (presentation.selectedAnnotationId) {
      openFromHost(presentation.selectedAnnotationId);
      return;
    }
    const target = findAnnotationTarget(
      rootRef.current,
      presentation.selectedTargetId
    );
    target?.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    dispatch({ type: 'targetHovered', target });
  }, [
    presentation.selectedTargetId,
    presentation.selectedAnnotationId,
    presentation.selectionId,
    rootRef,
  ]);

  async function saveAnnotation() {
    if (!editor || pending) return;
    dispatch({ type: 'saveStarted' });
    try {
      if (editor.annotationId)
        await annotationClient.updateAnnotation(
          editor.annotationId,
          editor.comment
        );
      else {
        const capture = screenshot.current;
        if (!capture || capture.draftId !== editor.draft.id)
          throw new Error('Annotation capture is unavailable.');
        const image = await capture.result;
        if (!image) {
          dispatch({
            type: 'captureCompleted',
            draftId: editor.draft.id,
            succeeded: false,
          });
          return;
        }
        await annotationClient.addAnnotation({
          ...editor.draft,
          comment: editor.comment,
          context: { ...editor.draft.context, screenshot: image },
        });
      }
      screenshot.current = undefined;
      dispatch({ type: 'editorClosed' });
    } catch (error) {
      dispatch({
        type: 'saveFailed',
        error:
          (error instanceof DataAppError ||
            error instanceof MessageRoutingError) &&
          error.code === 'annotation_limit'
            ? error.message
            : 'Could not save annotation. Try again.',
      });
    } finally {
      dispatch({ type: 'saveFinished' });
    }
  }

  return (
    <>
      {presentation.active === undefined && (
        <AnnotationTrigger
          buttonRef={toolbarRef}
          active={active}
          disabled={pending}
          count={presentation.targets?.length ?? 0}
          onToggle={toggleAnnotationMode}
        />
      )}
      {createPortal(
        <>
          {active && discovery.scope && (
            <AnnotationSelectionLayer
              scope={discovery.scope}
              targets={discovery.targets}
              disabled={pending}
              editing={Boolean(editor)}
              onHover={target => dispatch({ type: 'targetHovered', target })}
              onSelect={(target, cursor, region) =>
                selectFromLayer({ target, cursor, region })
              }
            />
          )}
          <AnnotationMarkers
            outline={active ? geometry.outline : undefined}
            rounded={
              (editor?.target ?? hoveredTarget)?.kind === 'widget' &&
              !editor?.draft.context.region
            }
            pins={geometry.pins}
            pinsVisible={presentation.pinsVisible !== false}
            disabled={pending || Boolean(editor)}
            showHint={active && !editor && presentation.showHint !== false}
            hasDuplicateIds={discovery.hasDuplicateIds}
            onOpenAnnotation={openAnnotation}
          />
          {active && editor && (
            <AnnotationEditor
              editor={editor}
              editorRef={refs.setFloating}
              textareaRef={textareaRef}
              style={floatingStyles}
              disabled={pending}
              onCommentChange={comment =>
                dispatch({ type: 'commentChanged', comment })
              }
              onSubmit={() => void saveAnnotation()}
              onSend={() => {
                if (
                  pending ||
                  hasUnsavedChanges ||
                  !presentation.targets?.length
                )
                  return;
                void annotationClient.requestSendAnnotations().catch(() => {});
              }}
              onRetryScreenshot={retryScreenshot}
              onShakeEnd={() => dispatch({ type: 'shakeFinished' })}
            />
          )}
        </>,
        document.body
      )}
    </>
  );
}
