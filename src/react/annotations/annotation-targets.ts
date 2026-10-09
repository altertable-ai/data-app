export type AnnotationPoint = { x: number; y: number };
export type AnnotationRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type AnnotationTargetElement = {
  element: HTMLElement;
  id: string;
  label: string;
  kind: 'widget' | 'element' | 'app';
};

export function discoverAnnotationTargets(root: HTMLElement | null): {
  targets: AnnotationTargetElement[];
  hasDuplicateIds: boolean;
} {
  const found: AnnotationTargetElement[] = Array.from(
    root?.querySelectorAll<HTMLElement>('[data-annotation-id]') ?? []
  ).flatMap(element => {
    if (
      element.closest('[aria-hidden="true"]') ||
      !element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
        contentVisibilityAuto: true,
      })
    )
      return [];
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    const id = element.dataset.annotationId;
    const label =
      element.dataset.annotationLabel ??
      element.querySelector('h2')?.textContent ??
      'App item';
    return id
      ? [
          {
            element,
            id,
            label,
            kind:
              element.dataset.annotationKind === 'element'
                ? ('element' as const)
                : ('widget' as const),
          },
        ]
      : [];
  });
  const counts = new Map<string, number>();
  for (const target of found)
    counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
  const resolved = found.map(target => {
    const fallbackId = target.element.dataset.annotationFallbackId;
    return counts.get(target.id)! > 1 && fallbackId
      ? { ...target, id: fallbackId }
      : target;
  });
  const resolvedCounts = new Map<string, number>();
  for (const target of resolved)
    resolvedCounts.set(target.id, (resolvedCounts.get(target.id) ?? 0) + 1);
  return {
    targets: resolved.filter(target => resolvedCounts.get(target.id) === 1),
    hasDuplicateIds: [...resolvedCounts.values()].some(count => count > 1),
  };
}
export function annotationGeometry(element: HTMLElement): AnnotationRect {
  const rect = element.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}
export function annotationPoint(rect: AnnotationRect, point?: AnnotationPoint) {
  const cursor = point ?? {
    x:
      (Math.max(0, rect.x) + Math.min(window.innerWidth, rect.x + rect.width)) /
      2,
    y:
      (Math.max(0, rect.y) +
        Math.min(window.innerHeight, rect.y + rect.height)) /
      2,
  };
  return {
    cursor,
    anchor: {
      x: Math.max(
        0,
        Math.min(1, (cursor.x - rect.x) / Math.max(1, rect.width))
      ),
      y: Math.max(
        0,
        Math.min(1, (cursor.y - rect.y) / Math.max(1, rect.height))
      ),
    },
  };
}

/** The iframe document is a crop surface, never a selectable global-layout target. */
export function annotationRoot(
  root: HTMLElement | null
): AnnotationTargetElement | undefined {
  const element = root?.ownerDocument.body;
  return element
    ? { element, id: '__data-app-root', label: 'Selected area', kind: 'app' }
    : undefined;
}
export function annotationTargetLookup(root: HTMLElement | null) {
  const targets = discoverAnnotationTargets(root).targets;
  const byId = new Map(targets.map(target => [target.id, target]));
  // A saved fallback still resolves if its evidence ID later becomes unique.
  for (const target of targets) {
    const fallbackId = target.element.dataset.annotationFallbackId;
    if (fallbackId && !byId.has(fallbackId)) byId.set(fallbackId, target);
  }
  const app = annotationRoot(root);
  if (app) byId.set(app.id, app);
  return byId;
}

export function findAnnotationTarget(
  root: HTMLElement | null,
  id: string | undefined
) {
  return id === undefined ? undefined : annotationTargetLookup(root).get(id);
}

export function normalizeAnnotationRect(
  area: AnnotationRect,
  target: AnnotationRect
): AnnotationRect {
  return {
    x: (area.x - target.x) / target.width,
    y: (area.y - target.y) / target.height,
    width: area.width / target.width,
    height: area.height / target.height,
  };
}
export function projectAnnotationRect(
  area: AnnotationRect,
  target: AnnotationRect
): AnnotationRect {
  return {
    x: target.x + target.width * area.x,
    y: target.y + target.height * area.y,
    width: target.width * area.width,
    height: target.height * area.height,
  };
}
