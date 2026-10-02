import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { MessageRoutingError } from '@/src/core/messages';
import { DataAppError } from '@/src/client/transport';
import { getDataAppTransport } from '@/src/client/iframe';
import { getDataAppNavigation } from '@/src/client/navigation';
import { createMessageClient } from '@/src/client/messages';
import {
  annotationDraftRoute,
  type DataAppAnnotationDraft,
  type DataAppAnnotationPresentation,
} from '@/src/core/annotations';
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
  const toolbarRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLSelectElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState<Target>();
  const [selected, setSelected] = useState<Target>();
  const [draft, setDraft] = useState<DataAppAnnotationDraft>();
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [available, setAvailable] = useState<Target[]>([]);
  const [ambiguous, setAmbiguous] = useState(false);
  const [boxes, setBoxes] = useState<
    { id: string; number: number; rect: ReturnType<typeof geometry> }[]
  >([]);
  const [outline, setOutline] = useState<ReturnType<typeof geometry>>();

  function select(target: Target) {
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

  function finish() {
    setActive(false);
    setSelected(undefined);
    setDraft(undefined);
    setHovered(undefined);
    toolbarRef.current?.focus();
  }
  const finishFromKeyboard = useEffectEvent(finish);
  const captureSelection = useEffectEvent(select);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [draft?.id]);
  useEffect(() => {
    if (!active) return;
    pickerRef.current?.focus();
    const root = rootRef.current;
    function updateTargets() {
      const selectable = targets(root);
      setAvailable(selectable);
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
        event.preventDefault();
        finishFromKeyboard();
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
  }, [active, rootRef, displayedInput, view, pending]);

  useEffect(() => {
    const target = targets(rootRef.current).find(
      target => target.id === presentation.selectedTargetId
    );
    if (target) {
      target.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    setHovered(target);
  }, [presentation.selectedTargetId, presentation.selectionId, rootRef]);

  useEffect(() => {
    function measure() {
      const all = targets(rootRef.current);
      setBoxes(
        (presentation.targets ?? []).flatMap(pin => {
          const target = all.find(target => target.id === pin.targetId);
          return target
            ? [
                {
                  id: pin.id,
                  number: pin.number,
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

  async function addFeedback() {
    if (!draft || pending) return;
    setPending(true);
    setError('');
    try {
      const bridge = getDataAppTransport();
      if (!bridge) throw new Error('No host');
      await createMessageClient(
        { 'annotation:draft': annotationDraftRoute },
        bridge.request
      ).request('annotation:draft', { ...draft, comment });
      setSelected(undefined);
      setDraft(undefined);
      setComment('');
    } catch (error) {
      setError(
        (error instanceof DataAppError ||
          error instanceof MessageRoutingError) &&
          error.code === 'annotation_limit'
          ? error.message
          : 'Could not add feedback. Try again.'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        size="compact"
        variant="elevated"
        ref={toolbarRef}
        aria-pressed={active}
        disabled={pending}
        onClick={() => {
          setActive(!active);
          setSelected(undefined);
          setDraft(undefined);
          setHovered(undefined);
        }}
      >
        Annotate
      </Button>
      {createPortal(
        <>
          {outline && (
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
          {boxes.map(box => (
            <span
              key={box.id}
              className="altertable-annotation-pin"
              aria-label={`Annotation ${box.number}`}
              style={{
                left: Math.max(8, box.rect.x + box.rect.width - 24),
                top: box.rect.y + 8,
              }}
            >
              {box.number}
            </span>
          ))}
          {active && (
            <section
              className="altertable-annotation-composer"
              aria-label="Annotate app"
            >
              <div className="altertable-annotation-heading">
                <strong>
                  {selected ? selected.label : 'Select an element to annotate'}
                </strong>
                <Button size="compact" disabled={pending} onClick={finish}>
                  Done
                </Button>
              </div>
              <label>
                Element
                <select
                  ref={pickerRef}
                  aria-label="Element to annotate"
                  disabled={pending}
                  value={selected?.id ?? ''}
                  onChange={event => {
                    const target = available.find(
                      target => target.id === event.target.value
                    );
                    if (target) {
                      target.element.scrollIntoView({ block: 'center' });
                      select(target);
                    }
                  }}
                >
                  <option value="">Choose an element</option>
                  {available.map((target, index) => (
                    <option key={`${target.id}:${index}`} value={target.id}>
                      {target.label}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <div>
                  <label>
                    What should change?
                    <textarea
                      aria-label="What should change?"
                      ref={textareaRef}
                      maxLength={2000}
                      value={comment}
                      disabled={pending}
                      onChange={event => setComment(event.target.value)}
                    />
                  </label>
                  {error && <p role="alert">{error}</p>}
                  <Button
                    onClick={() => void addFeedback()}
                    size="compact"
                    variant="elevated"
                    disabled={pending || !comment.trim()}
                  >
                    {pending ? 'Adding feedback…' : 'Add feedback'}
                  </Button>
                </div>
              )}
              {ambiguous && (
                <p>
                  <output>
                    Some elements can’t be selected. Ask the agent to make them
                    available for feedback.
                  </output>
                </p>
              )}
              <p>
                Feedback is added to your chat draft. Send the message to ask
                the agent to make changes.
              </p>
            </section>
          )}
        </>,
        document.body
      )}
    </>
  );
}
