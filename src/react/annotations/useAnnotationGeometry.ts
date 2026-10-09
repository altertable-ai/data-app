import { useEffect, useState, type ComponentRef, type RefObject } from 'react';
import type { DataAppAnnotationPresentation } from '@/src/core/annotations';
import {
  annotationGeometry,
  discoverAnnotationTargets,
  annotationTargetLookup,
  projectAnnotationRect,
  type AnnotationRect,
  type AnnotationTargetElement,
} from '@/src/react/annotations/annotation-targets';
import type { AnnotationPin } from '@/src/react/annotations/AnnotationMarkers';

type AnnotationRootRef = RefObject<ComponentRef<'div'> | null>;

export function useAnnotationTargets(
  rootRef: AnnotationRootRef,
  active: boolean
) {
  const [discovery, setDiscovery] = useState<
    ReturnType<typeof discoverAnnotationTargets> & { scope?: HTMLElement }
  >({ targets: [], hasDuplicateIds: false });
  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    function discover() {
      setDiscovery({
        ...discoverAnnotationTargets(root),
        scope:
          root?.closest<HTMLElement>('.altertable-app-main') ??
          root ??
          undefined,
      });
    }
    discover();
    const observer = new MutationObserver(discover);
    if (root)
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'data-annotation-id',
          'data-annotation-label',
          'hidden',
          'aria-hidden',
          'style',
          'class',
        ],
      });
    window.addEventListener('resize', discover);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', discover);
    };
  }, [rootRef, active]);
  return discovery;
}

type AnnotationGeometryOptions = {
  rootRef: AnnotationRootRef;
  target?: AnnotationTargetElement;
  region?: AnnotationRect;
  targets: DataAppAnnotationPresentation['targets'];
};

export function useAnnotationGeometry({
  rootRef,
  target,
  region,
  targets,
}: AnnotationGeometryOptions) {
  const [geometry, setGeometry] = useState<{
    pins: AnnotationPin[];
    outline?: AnnotationRect;
  }>({ pins: [] });
  useEffect(() => {
    function measure() {
      const byId = targets?.length
        ? annotationTargetLookup(rootRef.current)
        : new Map<string, AnnotationTargetElement>();
      const pins = (targets ?? []).flatMap(pin => {
        const target = byId.get(pin.targetId);
        return target
          ? [
              {
                id: pin.id,
                number: pin.number,
                rect: annotationGeometry(target.element),
                anchor: pin.anchor ?? { x: 1, y: 0 },
              },
            ]
          : [];
      });
      const rect = target?.element.isConnected
        ? annotationGeometry(target.element)
        : undefined;
      setGeometry({
        pins,
        outline: rect && region ? projectAnnotationRect(region, rect) : rect,
      });
    }
    let frame: number | undefined;
    function scheduleMeasure() {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        measure();
      });
    }
    measure();
    const observer = new ResizeObserver(scheduleMeasure);
    if (rootRef.current) observer.observe(rootRef.current);
    window.addEventListener('resize', scheduleMeasure);
    document.addEventListener('scroll', scheduleMeasure, true);
    return () => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleMeasure);
      document.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [rootRef, target, region, targets]);
  return geometry;
}
