import {
  useEffect,
  useEffectEvent,
  useRef,
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
import { AppIcon } from '@/src/react/ui/icons';
import { Kbd } from '@/src/react/ui/Kbd';
import { Tooltip } from '@/src/react/ui/Tooltip';
import {
  shortcuts,
  useShortcut,
  ariaKeyShortcuts,
} from '@/src/react/ui/shortcuts';
import { Button } from '@/src/react/ui/Button';

type Target = { element: HTMLElement; id: string; label: string };
function targets(root: HTMLElement | null): Target[] {
  const found = Array.from(
    root?.querySelectorAll<HTMLElement>('[data-annotation-id]') ?? []
  ).flatMap(element => {
    const id = element.dataset.annotationId;
    const label =
      element.dataset.annotationLabel ??
      element.querySelector('h2')?.textContent ??
      'App element';
    return id ? [{ element, id, label }] : [];
  });
  return found.filter(
    target => found.filter(other => other.id === target.id).length === 1
  );
}
function geometry(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

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
  const [saving, setSaving] = useState(false);
  const pending = saving || presentation.readOnly === true;
  const [ambiguous, setAmbiguous] = useState(false);
  const [boxes, setBoxes] = useState<
    {
      id: string;
      number: number;
      offset: number;
      rect: ReturnType<typeof geometry>;
    }[]
  >([]);
  const [outline, setOutline] = useState<ReturnType<typeof geometry>>();

  useEffect(() => {
    void annotationClient.setEditorState(hasUnsavedChanges).catch(() => {});
  }, [annotationClient, hasUnsavedChanges]);

  const { refs, floatingStyles } = useFloating({
    elements: { reference: selected?.element },
    placement: 'right-start',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 12, crossAxis: true })],
    whileElementsMounted: autoUpdate,
  });

  const floatingRef = useMergeRefs([refs.setFloating]);

  function selectTarget(target: Target) {
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
    setDraft({
      id: crypto.randomUUID(),
      target: {
        id: target.id,
        label: target.label.slice(0, 256),
        kind:
          target.element.dataset.annotationKind === 'element'
            ? 'element'
            : 'widget',
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
        search: (location?.search ?? window.location.search).slice(0, 2048),
        hash: (location?.hash ?? window.location.hash).slice(0, 1024),
        displayedInput: input,
        view:
          target.element
            .querySelector('[role=tab][aria-selected=true]')
            ?.textContent?.slice(0, 128) ?? view,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        rect: geometry(target.element),
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
    const target = targets(rootRef.current).find(
      target => target.id === pin?.targetId
    );
    if (!pin || !target || pending) return;
    setAnnotationMode(true);
    target.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    selectTarget(target);
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
  const finishFromKeyboard = useEffectEvent(closeAnnotationMode);
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
    function capture(event: Event) {
      if (!(event.target instanceof Element) || !root?.contains(event.target))
        return;
      const element = event.target.closest<HTMLElement>('[data-annotation-id]');
      const target = targets(root).find(target => target.element === element);
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'click' && target && !pending)
        captureSelection(target);
    }
    function hover(event: PointerEvent) {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>('[data-annotation-id]');
      setHovered(targets(root).find(target => target.element === element));
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) {
        if (event.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        if (hasUnsavedChanges && !discardArmed.current) {
          discardArmed.current = true;
          setShaking(true);
        } else finishFromKeyboard();
      } else if (
        event.code === 'Period' &&
        event.shiftKey &&
        (event.metaKey || event.ctrlKey)
      ) {
        return;
      } else if (
        !pending &&
        !draft &&
        ['Tab', 'ArrowRight', 'ArrowLeft', 'Enter'].includes(event.key)
      ) {
        const all = targets(root);
        if (!all.length) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Enter' && hovered) captureSelection(hovered);
        else {
          const current = all.findIndex(target => target.id === hovered?.id);
          const direction =
            event.shiftKey || event.key === 'ArrowLeft' ? -1 : 1;
          const target = all[(current + direction + all.length) % all.length]!;
          target.element.scrollIntoView({ block: 'nearest' });
          setHovered(target);
        }
      } else if (event.target instanceof Node && root?.contains(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener('pointerdown', capture, true);
    document.addEventListener('click', capture, true);
    document.addEventListener('pointermove', hover);
    document.addEventListener('keydown', escape, true);
    return () => {
      mutations.disconnect();
      document.removeEventListener('pointerdown', capture, true);
      document.removeEventListener('click', capture, true);
      document.removeEventListener('pointermove', hover);
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
    const target = targets(rootRef.current).find(
      target => target.id === presentation.selectedTargetId
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
      const all = targets(rootRef.current);
      setBoxes(
        (presentation.targets ?? []).flatMap((pin, index) => {
          const target = all.find(target => target.id === pin.targetId);
          return target
            ? [
                {
                  id: pin.id,
                  number: pin.number,
                  offset:
                    (presentation.targets ?? [])
                      .slice(0, index)
                      .filter(other => other.targetId === pin.targetId).length *
                    28,
                  rect: geometry(target.element),
                },
              ]
            : [];
        })
      );
      const element = (selected ?? hovered)?.element;
      setOutline(element?.isConnected ? geometry(element) : undefined);
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
  }, [selected, hovered, presentation.targets, rootRef]);

  async function saveAnnotation() {
    if (!draft || pending) return;
    setSaving(true);
    setError('');
    try {
      if (editingId)
        await annotationClient.updateAnnotation(editingId, comment);
      else await annotationClient.sendAnnotation({ ...draft, comment });
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
          {outline && presentation.pinsVisible !== false && (
            <div
              aria-hidden
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
              onClick={() => openAnnotation(box.id)}
              disabled={pending}
              key={box.id}
              className="altertable-annotation-pin"
              aria-label={`Annotation ${box.number}`}
              style={{
                left: Math.max(
                  8,
                  box.rect.x + box.rect.width - 24 - box.offset
                ),
                top: box.rect.y + 8,
              }}
            >
              {box.number}
            </button>
          ))}
          {active && !selected && presentation.showHint !== false && (
            <output className="altertable-annotation-hint">
              {ambiguous ? (
                'Some items cannot be annotated.'
              ) : (
                <>
                  Point at an item to annotate · <Kbd>Esc</Kbd> to exit
                </>
              )}
            </output>
          )}
          {active && selected && (
            <section
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
                  disabled={pending || !comment.trim()}
                >
                  <ArrowUp size={16} aria-hidden />
                </Button>
              </Tooltip>
              {error && <p role="alert">{error}</p>}
            </section>
          )}
        </>,
        document.body
      )}
    </>
  );
}
