export type AnnotationPoint = { x: number; y: number };
export type AnnotationTargetElement = {
  element: HTMLElement;
  id: string;
  label: string;
  kind: 'widget' | 'element' | 'app';
};

export function annotationTargets(
  root: HTMLElement | null
): AnnotationTargetElement[] {
  const main = root?.closest<HTMLElement>('.altertable-app-main');
  const found: AnnotationTargetElement[] = Array.from(
    root?.querySelectorAll<HTMLElement>('[data-annotation-id]') ?? []
  ).flatMap(element => {
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
  if (main)
    found.unshift({
      element: main,
      id: '__data-app-root',
      label: 'App layout',
      kind: 'app',
    });
  return found.filter(
    target => found.filter(other => other.id === target.id).length === 1
  );
}
export function annotationGeometry(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}
export function annotationPoint(element: HTMLElement, point?: AnnotationPoint) {
  const rect = element.getBoundingClientRect();
  const cursor = point ?? {
    x: (Math.max(0, rect.left) + Math.min(window.innerWidth, rect.right)) / 2,
    y: (Math.max(0, rect.top) + Math.min(window.innerHeight, rect.bottom)) / 2,
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
