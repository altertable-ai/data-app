import {
  useEffect,
  useEffectEvent,
  useRef,
  useMemo,
  useState,
  type RefObject,
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
import { ArrowUp } from 'lucide-react';
import { MessageRoutingError } from '@/src/core/messages';
import { DataAppError } from '@/src/client/transport';
import { getDataAppNavigation } from '@/src/client/navigation';
import {
  type DataAppAnnotationDraft,
  type DataAppAnnotationPresentation,
} from '@/src/core/annotations';
import { useDataAppAnnotations } from '@/src/react/useDataAppAnnotations';
import {
  annotationTargets as targets,
  findAnnotationTarget,
  annotationGeometry as geometry,
  annotationPoint,
  type AnnotationTargetElement as Target,
  type AnnotationPoint,
} from '@/src/react/ui/annotation-targets';
import { captureAnnotationScreenshot } from '@/src/react/ui/annotation-screenshot';
import {
  AnnotationSelectionLayer,
  type AnnotationRegion,
} from '@/src/react/ui/AnnotationSelectionLayer';
import { AppIcon } from '@/src/react/ui/icons';
import { Kbd } from '@/src/react/ui/Kbd';
import { Tooltip } from '@/src/react/ui/Tooltip';
import {
  shortcuts,
  useShortcut,
  ariaKeyShortcuts,
} from '@/src/react/ui/shortcuts';
import { Button } from '@/src/react/ui/Button';

export function AnnotationControls({
  rootRef,
  presentation,
  displayedInput,
  view,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  presentation: DataAppAnnotationPresentation;
  displayedInput?: unknown;
  view?: string;
}) {
  const annotationClient = useDataAppAnnotations();
  const screenshot = useRef<
    | {
        id: string;
        result: Promise<{
          image?: NonNullable<DataAppAnnotationDraft['context']['screenshot']>;
          error?: unknown;
        }>;
      }
    | undefined
  >(undefined);
  const toolbarRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localActive, setActive] = useState(false);
  const active = presentation.active ?? localActive;
  const [hovered, setHovered] = useState<Target>();
  const [selected, setSelected] = useState<Target>();
  const [draft, setDraft] = useState<DataAppAnnotationDraft>();
  const [comment, setComment] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const savedComment =
    presentation.targets?.find(pin => pin.id === editingId)?.comment ?? '';
  const hasUnsavedChanges = Boolean(draft) && comment !== savedComment;
  const [shaking, setShaking] = useState(false);
  const discardArmed = useRef(false);
  const [error, setError] = useState('');
  const [captureStatus, setCaptureStatus] = useState<
    'capturing' | 'ready' | 'failed'
  >('ready');
  const [saving, setSaving] = useState(false);
  const pending = saving || presentation.readOnly === true;
  const [ambiguous, setAmbiguous] = useState(false);
  const [boxes, setBoxes] = useState<
    {
      id: string;
      number: number;
      anchor: AnnotationPoint;
      rect: ReturnType<typeof geometry>;
    }[]
  >([]);
  const [outline, setOutline] = useState<ReturnType<typeof geometry>>();

  useEffect(() => {
    void annotationClient.setEditorState(hasUnsavedChanges).catch(() => {});
  }, [annotationClient, hasUnsavedChanges]);

  const reference = useMemo(
    () =>
      selected && draft?.context.anchor
        ? {
            contextElement: selected.element,
            getBoundingClientRect() {
              const rect = selected.element.getBoundingClientRect();
              return new DOMRect(
                rect.x + rect.width * draft.context.anchor!.x,
                rect.y + rect.height * draft.context.anchor!.y,
                0,
                0
              );
            },
          }
        : selected?.element,
    [selected, draft]
  );
  const { refs, floatingStyles } = useFloating({
    placement: 'right-start',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 12, crossAxis: true })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setPositionReference(reference ?? null);
  }, [refs, reference]);
  const floatingRef = useMergeRefs([refs.setFloating]);

  function selectTarget(
    target: Target,
    cursor?: AnnotationPoint,
    capture = true,
    region?: AnnotationRegion
  ) {
    setEditingId(undefined);
    discardArmed.current = false;
    setShaking(false);
    const location = getDataAppNavigation()?.snapshot();
    const input =
      displayedInput === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(displayedInput)) as unknown);
    setSelected(target);
    setHovered(undefined);
    setError('');
    setComment('');
    const id = crypto.randomUUID();
    const point = annotationPoint(target.element, cursor);
    setCaptureStatus(capture ? 'capturing' : 'ready');
    if (capture)
      screenshot.current = {
        id,
        result: captureAnnotationScreenshot(target.element, region).then(
          image => {
            if (screenshot.current?.id === id) setCaptureStatus('ready');
            return { image };
          },
          error => {
            if (screenshot.current?.id === id) setCaptureStatus('failed');
            return { error };
          }
        ),
      };
    else screenshot.current = undefined;
    setDraft({
      id,
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
        ...(region
          ? {
              region: {
                x:
                  (region.x - target.element.getBoundingClientRect().x) /
                  target.element.getBoundingClientRect().width,
                y:
                  (region.y - target.element.getBoundingClientRect().y) /
                  target.element.getBoundingClientRect().height,
                width:
                  region.width / target.element.getBoundingClientRect().width,
                height:
                  region.height / target.element.getBoundingClientRect().height,
              },
            }
          : {}),
        search: (location?.search ?? window.location.search).slice(0, 2048),
        hash: (location?.hash ?? window.location.hash).slice(0, 1024),
        displayedInput: input,
        view:
          target.element
            .querySelector('[role=tab][aria-selected=true]')
            ?.textContent?.slice(0, 128) ?? view,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        rect: region ?? geometry(target.element),
      },
      comment: '',
    });
  }

  const [lastActive, setLastActive] = useState(active);
  if (lastActive !== active) {
    setLastActive(active);
    if (!active) {
      setSelected(undefined);
      setDraft(undefined);
      setHovered(undefined);
    }
  }

  function closeAnnotationMode() {
    setAnnotationMode(false);
    setSelected(undefined);
    setDraft(undefined);
    setHovered(undefined);
    setEditingId(undefined);
    setComment('');
    discardArmed.current = false;
    setShaking(false);
    toolbarRef.current?.focus();
  }
  function setAnnotationMode(value: boolean) {
    setActive(value);
    if (presentation.active !== undefined)
      void annotationClient.setMode(value).catch(() => {});
  }
  useShortcut(
    shortcuts.annotate,
    () => (active ? closeAnnotationMode() : setAnnotationMode(true)),
    !pending,
    true
  );

  function openAnnotation(id: string) {
    const pin = presentation.targets?.find(pin => pin.id === id);
    const target = findAnnotationTarget(rootRef.current, pin?.targetId);
    if (!pin || !target || pending) return;
    setAnnotationMode(true);
    const rect = target.element.getBoundingClientRect();
    const pointY = rect.y + rect.height * (pin.anchor?.y ?? 0.5);
    if (pointY < 0 || pointY > window.innerHeight)
      window.scrollBy({
        top: pointY - window.innerHeight / 2,
        behavior: 'smooth',
      });
    selectTarget(
      target,
      pin.anchor
        ? {
            x: rect.x + pin.anchor.x * rect.width,
            y: rect.y + pin.anchor.y * rect.height,
          }
        : undefined,
      false
    );
    if (pin.region)
      setDraft(current =>
        current
          ? { ...current, context: { ...current.context, region: pin.region } }
          : current
      );
    setEditingId(id);
    setComment(pin.comment ?? '');
  }
  const openFromHost = useEffectEvent(openAnnotation);
  if (editingId && !presentation.targets?.some(pin => pin.id === editingId)) {
    setSelected(undefined);
    setDraft(undefined);
    setEditingId(undefined);
    setComment('');
  }
  function closeEditor() {
    setSelected(undefined);
    setDraft(undefined);
    setEditingId(undefined);
    setComment('');
    discardArmed.current = false;
    setShaking(false);
  }
  const finishFromKeyboard = useEffectEvent(() =>
    draft ? closeEditor() : closeAnnotationMode()
  );
  const captureSelection = useEffectEvent(selectTarget);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [draft?.id, active]);
  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    function updateTargets() {
      const selectable = targets(root);
      setAmbiguous(
        (root?.querySelectorAll('[data-annotation-id]').length ?? 0) >
          selectable.length
      );
    }
    updateTargets();
    const mutations = new MutationObserver(updateTargets);
    if (root)
      mutations.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-annotation-id', 'data-annotation-label'],
      });
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !(pending && draft)) {
        if (document.querySelector('dialog[open], [data-selecting]')) return;
        if (event.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        if (hasUnsavedChanges && !discardArmed.current) {
          discardArmed.current = true;
          setShaking(true);
        } else finishFromKeyboard();
      }
    }
    document.addEventListener('keydown', escape, true);
    return () => {
      mutations.disconnect();
      document.removeEventListener('keydown', escape, true);
    };
  }, [
    active,
    rootRef,
    displayedInput,
    view,
    pending,
    draft,
    hovered,
    hasUnsavedChanges,
  ]);

  useEffect(() => {
    if (presentation.selectedAnnotationId) {
      openFromHost(presentation.selectedAnnotationId);
      return;
    }
    const target = findAnnotationTarget(
      rootRef.current,
      presentation.selectedTargetId
    );
    if (target) {
      target.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    setHovered(target);
  }, [
    presentation.selectedTargetId,
    presentation.selectedAnnotationId,
    presentation.selectionId,
    rootRef,
  ]);

  useEffect(() => {
    function measure() {
      setBoxes(
        (presentation.targets ?? []).flatMap(pin => {
          const target = findAnnotationTarget(rootRef.current, pin.targetId);
          return target
            ? [
                {
                  id: pin.id,
                  number: pin.number,
                  rect: geometry(target.element),
                  anchor: pin.anchor ?? { x: 1, y: 0 },
                },
              ]
            : [];
        })
      );
      const element = (selected ?? hovered)?.element;
      const area = draft?.context.region;
      const rect = element?.isConnected ? geometry(element) : undefined;
      setOutline(
        rect && area
          ? {
              x: rect.x + rect.width * area.x,
              y: rect.y + rect.height * area.y,
              width: rect.width * area.width,
              height: rect.height * area.height,
            }
          : rect
      );
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (rootRef.current) observer.observe(rootRef.current);
    window.addEventListener('resize', measure);
    document.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('scroll', measure, true);
    };
  }, [selected, hovered, draft?.context.region, presentation.targets, rootRef]);

  async function saveAnnotation() {
    if (!draft || pending) return;
    setSaving(true);
    setError('');
    try {
      if (editingId)
        await annotationClient.updateAnnotation(editingId, comment);
      else {
        const capture = screenshot.current;
        if (!capture || capture.id !== draft.id)
          throw new Error('Annotation capture is unavailable.');
        const result = await capture.result;
        if (!result.image) {
          setCaptureStatus('failed');
          return;
        }
        await annotationClient.addAnnotation({
          ...draft,
          comment,
          context: { ...draft.context, screenshot: result.image },
        });
      }
      setEditingId(undefined);
      setSelected(undefined);
      setDraft(undefined);
      setComment('');
    } catch (error) {
      setError(
        (error instanceof DataAppError ||
          error instanceof MessageRoutingError) &&
          error.code === 'annotation_limit'
          ? error.message
          : 'Could not save annotation. Try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {presentation.active === undefined && (
        <Tooltip
          tooltipProps={{ className: 'altertable-annotation-tooltip' }}
          content={
            <>
              Point at items to change the data app{' '}
              <Kbd shortcut={shortcuts.annotate} />
            </>
          }
        >
          <Button
            data-annotation-ui
            aria-label="Annotate"
            aria-keyshortcuts={ariaKeyShortcuts(shortcuts.annotate)}
            size="compact"
            variant="elevated"
            ref={toolbarRef}
            aria-pressed={active}
            disabled={pending}
            onClick={() =>
              active ? closeAnnotationMode() : setAnnotationMode(true)
            }
          >
            <AppIcon name="annotate" size={16} /> Annotate{' '}
            {presentation.targets?.length ? (
              <span className="altertable-annotation-count">
                {presentation.targets.length}
              </span>
            ) : null}
          </Button>
        </Tooltip>
      )}
      {createPortal(
        <>
          {active && rootRef.current && (
            <AnnotationSelectionLayer
              scope={
                rootRef.current.closest<HTMLElement>('.altertable-app-main') ??
                rootRef.current
              }
              targets={targets(rootRef.current)}
              disabled={pending}
              editing={Boolean(draft)}
              onHover={setHovered}
              onSelect={(target, point, region) =>
                captureSelection(target, point, true, region)
              }
            />
          )}
          {outline && presentation.pinsVisible !== false && (
            <div
              aria-hidden
              data-annotation-ui
              data-widget={
                ((selected ?? hovered)?.kind === 'widget' &&
                  !draft?.context.region) ||
                undefined
              }
              className="altertable-annotation-outline"
              style={{
                left: outline.x,
                top: outline.y,
                width: outline.width,
                height: outline.height,
              }}
            />
          )}
          {(presentation.pinsVisible === false ? [] : boxes).map(box => (
            <button
              type="button"
              data-annotation-ui
              onClick={() => openAnnotation(box.id)}
              disabled={pending || Boolean(draft)}
              key={box.id}
              className="altertable-annotation-pin"
              aria-label={`Annotation ${box.number}`}
              style={{
                left: box.rect.x + box.rect.width * box.anchor.x - 12,
                top: box.rect.y + box.rect.height * box.anchor.y - 12,
              }}
            >
              {box.number}
            </button>
          ))}
          {active && !selected && presentation.showHint !== false && (
            <output data-annotation-ui className="altertable-annotation-hint">
              {ambiguous ? (
                'Some items cannot be annotated.'
              ) : (
                <>
                  Point at an item or drag to select <Kbd>Esc</Kbd> to exit
                </>
              )}
            </output>
          )}
          {active && selected && (
            <section
              data-annotation-ui
              ref={floatingRef}
              style={floatingStyles}
              className="altertable-annotation-composer"
              data-shaking={shaking || undefined}
              onAnimationEnd={() => setShaking(false)}
              aria-label="Annotation editor"
            >
              <textarea
                aria-label="Annotation text"
                placeholder="Describe what to change…"
                ref={textareaRef}
                rows={1}
                maxLength={2000}
                value={comment}
                disabled={pending}
                onChange={event => {
                  discardArmed.current = false;
                  setShaking(false);
                  setComment(event.target.value);
                }}
                onKeyDown={event => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    if (comment.trim()) void saveAnnotation();
                  }
                }}
              />
              <Tooltip
                tooltipProps={{ className: 'altertable-annotation-tooltip' }}
                content={
                  <>
                    {editingId ? 'Save annotation' : 'Add annotation'}{' '}
                    <Kbd>Enter</Kbd>
                  </>
                }
              >
                <Button
                  aria-label={editingId ? 'Save annotation' : 'Add annotation'}
                  onClick={() => void saveAnnotation()}
                  className="altertable-annotation-submit"
                  size="icon-compact"
                  variant="elevated"
                  disabled={
                    pending || !comment.trim() || captureStatus !== 'ready'
                  }
                >
                  <ArrowUp size={16} aria-hidden />
                </Button>
              </Tooltip>
              {captureStatus === 'capturing' && (
                <output className="altertable-annotation-capture-status">
                  Capturing screenshot…
                </output>
              )}
              {captureStatus === 'failed' && (
                <div className="altertable-annotation-capture-status">
                  <p role="alert">
                    Screenshot capture failed. Your text is preserved.
                  </p>
                  <Button
                    size="compact"
                    onClick={() => {
                      const rect = selected.element.getBoundingClientRect();
                      const anchor = draft?.context.anchor;
                      const region = draft?.context.region;
                      const text = comment;
                      selectTarget(
                        selected,
                        anchor
                          ? {
                              x: rect.x + rect.width * anchor.x,
                              y: rect.y + rect.height * anchor.y,
                            }
                          : undefined,
                        true,
                        region
                          ? {
                              x: rect.x + rect.width * region.x,
                              y: rect.y + rect.height * region.y,
                              width: rect.width * region.width,
                              height: rect.height * region.height,
                            }
                          : undefined
                      );
                      setComment(text);
                    }}
                  >
                    Retry screenshot
                  </Button>
                </div>
              )}
              {error && <p role="alert">{error}</p>}
            </section>
          )}
        </>,
        document.body
      )}
    </>
  );
}
