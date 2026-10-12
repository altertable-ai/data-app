import { useEffect, useState, type ComponentRef, type RefObject } from 'react';
import type { DataAppAnnotationPresentation } from '@/src/core/annotations';
import {
  annotationGeometry,
  discoverAnnotationTargets,
  indexAnnotationTargets,
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
  annotations: DataAppAnnotationPresentation['targets'];
};

export function useAnnotationGeometry({
  rootRef,
  target,
  region,
  annotations,
}: AnnotationGeometryOptions) {
  const [geometry, setGeometry] = useState<{
    pins: AnnotationPin[];
    outline?: AnnotationRect;
  }>({ pins: [] });
  useEffect(() => {
    function measure() {
      const targetsById = annotations?.length
        ? indexAnnotationTargets(rootRef.current)
        : undefined;
      const pins = (annotations ?? []).flatMap(pin => {
        const pinTarget = targetsById?.get(pin.targetId);
        return pinTarget
          ? [
              {
                id: pin.id,
                number: pin.number,
                rect: annotationGeometry(pinTarget.element),
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
    let animationFrame: number | undefined;
    function scheduleMeasure() {
      if (animationFrame !== undefined) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = undefined;
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
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', scheduleMeasure);
      document.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [rootRef, target, region, annotations]);
  return geometry;
}
