import { useEffect, useId, useRef, useState } from 'react';
import { annotationRoot } from '@/src/react/ui/annotation-targets';
import { Kbd } from '@/src/react/ui/Kbd';
import type {
  AnnotationTargetElement,
  AnnotationPoint,
} from '@/src/react/ui/annotation-targets';

export type AnnotationRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Own pointer selection and keyboard focus while the app underneath is inert. */
export function AnnotationSelectionLayer({
  scope,
  targets,
  onHover,
  onSelect,
  disabled,
  editing,
}: {
  scope: HTMLElement;
  targets: AnnotationTargetElement[];
  onHover: (target: AnnotationTargetElement | undefined) => void;
  onSelect: (
    target: AnnotationTargetElement,
    point?: AnnotationPoint,
    region?: AnnotationRegion
  ) => void;
  disabled: boolean;
  editing: boolean;
}) {
  const instructionsId = useId();
  const layer = useRef<HTMLButtonElement>(null);
  const start = useRef<AnnotationPoint | undefined>(undefined);
  const keyboardEnd = useRef<AnnotationPoint | undefined>(undefined);
  const [region, setRegion] = useState<AnnotationRegion>();
  const [index, setIndex] = useState(0);
  const current = targets[index];
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const app = scope.closest<HTMLElement>('.altertable-app-layout') ?? scope;
    const wasInert = app.inert;
    app.toggleAttribute('inert', true);
    function blockScroll(event: WheelEvent) {
      if (event.target === layer.current && !event.ctrlKey && !event.metaKey)
        event.preventDefault();
    }
    document.addEventListener('wheel', blockScroll, {
      passive: false,
      capture: true,
    });
    layer.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('wheel', blockScroll, true);
      app.toggleAttribute('inert', wasInert);
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      )
        previouslyFocused.focus({ preventScroll: true });
    };
  }, [scope]);
  useEffect(() => {
    if (!editing) layer.current?.focus({ preventScroll: true });
  }, [editing]);
  function pointAt(point: AnnotationPoint) {
    return targets
      .filter(target => {
        const rect = target.element.getBoundingClientRect();
        return (
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom
        );
      })
      .sort((a, b) => {
        const first = a.element.getBoundingClientRect();
        const second = b.element.getBoundingClientRect();
        return first.width * first.height - second.width * second.height;
      })[0];
  }
  function areaBetween(point: AnnotationPoint): AnnotationRegion | undefined {
    if (!start.current) return undefined;
    const left = Math.max(0, Math.min(start.current.x, point.x));
    const top = Math.max(0, Math.min(start.current.y, point.y));
    const right = Math.min(
      window.innerWidth,
      document.documentElement.clientWidth,
      Math.max(start.current.x, point.x)
    );
    const bottom = Math.min(
      window.innerHeight,
      document.documentElement.clientHeight,
      Math.max(start.current.y, point.y)
    );
    return {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }
  function finishSelection(point: AnnotationPoint) {
    const area = areaBetween(point);
    start.current = undefined;
    keyboardEnd.current = undefined;
    setRegion(undefined);
    if (disabled) return;
    if (area && area.width >= 8 && area.height >= 8) {
      const root = annotationRoot(scope);
      if (root) onSelect(root, point, area);
    } else {
      const target = pointAt(point);
      if (target) {
        setIndex(targets.findIndex(candidate => candidate.id === target.id));
        onSelect(target, point);
      }
    }
  }
  return (
    <>
      <button
        type="button"
        ref={layer}
        data-annotation-ui
        data-selecting={Boolean(region) || undefined}
        data-editing={editing || undefined}
        className="altertable-annotation-selection-layer"
        aria-label="Annotation selection"
        aria-describedby={instructionsId}
        onFocus={event => {
          if (
            !editing &&
            !disabled &&
            event.currentTarget.matches(':focus-visible')
          )
            onHover(current);
        }}
        aria-disabled={disabled || editing || undefined}
        tabIndex={disabled || editing ? -1 : 0}
        onKeyDown={event => {
          if (event.key === 'Escape' && start.current) {
            event.preventDefault();
            event.stopPropagation();
            start.current = undefined;
            keyboardEnd.current = undefined;
            setRegion(undefined);
            return;
          }
          if (disabled || editing) return;
          if (event.key === 'PageDown' || event.key === 'PageUp') {
            event.preventDefault();
            return;
          }
          if (event.key === 'Enter' && event.shiftKey && !keyboardEnd.current) {
            event.preventDefault();
            start.current = { x: 20, y: 20 };
            keyboardEnd.current = {
              x: start.current.x + 100,
              y: start.current.y + 80,
            };
            setRegion(areaBetween(keyboardEnd.current));
            onHover(undefined);
            return;
          }
          if (keyboardEnd.current) {
            if (event.key === 'Enter') {
              event.preventDefault();
              finishSelection(keyboardEnd.current);
            } else if (event.key.startsWith('Arrow')) {
              event.preventDefault();
              const movement = {
                x:
                  event.key === 'ArrowRight'
                    ? 10
                    : event.key === 'ArrowLeft'
                      ? -10
                      : 0,
                y:
                  event.key === 'ArrowDown'
                    ? 10
                    : event.key === 'ArrowUp'
                      ? -10
                      : 0,
              };
              keyboardEnd.current = {
                x: keyboardEnd.current.x + movement.x,
                y: keyboardEnd.current.y + movement.y,
              };
              if (event.shiftKey && start.current)
                start.current = {
                  x: start.current.x + movement.x,
                  y: start.current.y + movement.y,
                };
              setRegion(areaBetween(keyboardEnd.current));
            }
            return;
          }
          if (
            [
              'ArrowRight',
              'ArrowLeft',
              'ArrowDown',
              'ArrowUp',
              'Home',
              'End',
            ].includes(event.key)
          ) {
            event.preventDefault();
            if (!targets.length) return;
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? targets.length - 1
                  : (index +
                      (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) +
                      targets.length) %
                    targets.length;
            setIndex(next);
            const target = targets[next];
            target?.element.scrollIntoView({ block: 'nearest' });
            onHover(target);
          } else if ((event.key === 'Enter' || event.key === ' ') && current) {
            event.preventDefault();
            onSelect(current);
          }
        }}
        onPointerDown={event => {
          if (disabled || editing) {
            event.preventDefault();
            return;
          }
          if (event.button !== 0) return;
          event.preventDefault();
          layer.current?.focus({ preventScroll: true });
          keyboardEnd.current = undefined;
          start.current = { x: event.clientX, y: event.clientY };
          setRegion({ ...start.current, width: 0, height: 0 });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (disabled || editing) return;
          const point = { x: event.clientX, y: event.clientY };
          if (!start.current) {
            const target = pointAt(point);
            if (target)
              setIndex(
                targets.findIndex(candidate => candidate.id === target.id)
              );
            onHover(target);
            return;
          }
          setRegion(areaBetween(point));
        }}
        onPointerUp={event => {
          if (disabled || editing) return;
          const point = { x: event.clientX, y: event.clientY };
          if (!start.current) return;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          finishSelection(point);
        }}
        onPointerCancel={() => {
          start.current = undefined;
          keyboardEnd.current = undefined;
          setRegion(undefined);
        }}
      />
      <span id={instructionsId} className="altertable-sr-only">
        Click an item or drag to select an area. Use arrow keys to choose an
        item and <Kbd>Enter</Kbd> to annotate it. <Kbd>Shift+Enter</Kbd> starts
        a custom area; arrows resize it, Shift+arrows move it, and{' '}
        <Kbd>Enter</Kbd> confirms. <Kbd>Esc</Kbd> cancels an area, closes the
        editor, then exits annotation mode.
      </span>
      <output
        className="altertable-sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {region
          ? `Selected area ${Math.round(region.width)} by ${Math.round(region.height)} pixels.`
          : current
            ? `${current.label}, ${index + 1} of ${targets.length}`
            : 'Annotation mode'}
      </output>
      {region && (
        <div
          data-annotation-ui
          aria-hidden
          className="altertable-annotation-outline"
          style={{
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
          }}
        />
      )}
    </>
  );
}
