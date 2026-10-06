import { defineMessageRoute } from '@/src/core/messages';

export type DataAppAnnotationDraft = {
  id: string;
  target: {
    id: string;
    label: string;
    kind: 'widget' | 'element';
    text: string;
    queryNames: string[];
    glossaryIds: string[];
  };
  context: {
    search: string;
    hash: string;
    displayedInput?: unknown;
    view?: string;
    viewport: { width: number; height: number };
    rect: { x: number; y: number; width: number; height: number };
  };
  comment: string;
};

export type DataAppAnnotationPresentation = {
  enabled: boolean;
  /** When provided, the host owns the mode and renders the annotation trigger. */
  active?: boolean;
  targets?: { id: string; targetId: string; number: number }[];
  selectedTargetId?: string;
  selectionId?: string;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid annotation.');
  return value as Record<string, unknown>;
}
function text(value: unknown, limit: number, required = false): string {
  if (
    typeof value !== 'string' ||
    value.length > limit ||
    (required && !value.trim())
  )
    throw new Error('Invalid annotation text.');
  return value;
}
function names(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 20)
    throw new Error('Invalid annotation references.');
  return value.map(name => text(name, 128, true));
}
function number(value: unknown, positive = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Math.abs(value) > 1_000_000 ||
    (positive && value < 0)
  )
    throw new Error('Invalid annotation geometry.');
  return value;
}

/** Reconstruct at the boundary; discard extra fields and bound the entire JSON payload. */
export function parseDataAppAnnotationDraft(
  value: unknown
): DataAppAnnotationDraft {
  const input = object(value);
  const target = object(input.target);
  const context = object(input.context);
  const viewport = object(context.viewport);
  const rect = object(context.rect);
  if (target.kind !== 'widget' && target.kind !== 'element')
    throw new Error('Invalid annotation target.');
  const draft: DataAppAnnotationDraft = {
    id: text(input.id, 128, true),
    target: {
      id: text(target.id, 128, true),
      label: text(target.label, 256, true),
      kind: target.kind,
      text: text(target.text, 1024),
      queryNames: names(target.queryNames),
      glossaryIds: names(target.glossaryIds),
    },
    context: {
      search: text(context.search, 2048),
      hash: text(context.hash, 1024),
      viewport: {
        width: number(viewport.width, true),
        height: number(viewport.height, true),
      },
      rect: {
        x: number(rect.x),
        y: number(rect.y),
        width: number(rect.width, true),
        height: number(rect.height, true),
      },
      ...(context.view === undefined ? {} : { view: text(context.view, 128) }),
      ...(context.displayedInput === undefined
        ? {}
        : { displayedInput: context.displayedInput }),
    },
    comment: text(input.comment, 2000, true).trim(),
  };
  const json = JSON.stringify(draft);
  if (new TextEncoder().encode(json).byteLength > 12_000)
    throw new Error('Annotation is too large.');
  return JSON.parse(json) as DataAppAnnotationDraft;
}

export const annotationDraftRoute = /* @__PURE__ */ defineMessageRoute({
  input: parseDataAppAnnotationDraft,
  output(value: unknown): null {
    if (value !== null) throw new Error('Invalid annotation response.');
    return null;
  },
});

/** A controlled shell acknowledges local exits (for example Escape). */
export const annotationModeRoute = /* @__PURE__ */ defineMessageRoute({
  input(value: unknown): { active: boolean } {
    const input = object(value);
    if (typeof input.active !== 'boolean')
      throw new Error('Invalid annotation mode.');
    return { active: input.active };
  },
  output(value: unknown): null {
    if (value !== null) throw new Error('Invalid annotation response.');
    return null;
  },
});

export function isAnnotationPresentation(
  value: unknown
): value is DataAppAnnotationPresentation {
  if (!value || typeof value !== 'object') return false;
  const input = value as DataAppAnnotationPresentation;
  return (
    typeof input.enabled === 'boolean' &&
    (input.active === undefined || typeof input.active === 'boolean') &&
    (input.selectionId === undefined ||
      (typeof input.selectionId === 'string' &&
        input.selectionId.length <= 128)) &&
    (input.selectedTargetId === undefined ||
      (typeof input.selectedTargetId === 'string' &&
        input.selectedTargetId.length <= 128)) &&
    (input.targets === undefined ||
      (Array.isArray(input.targets) &&
        input.targets.length <= 50 &&
        input.targets.every(
          target =>
            target &&
            typeof target.id === 'string' &&
            target.id.length <= 128 &&
            typeof target.targetId === 'string' &&
            target.targetId.length <= 128 &&
            Number.isSafeInteger(target.number) &&
            target.number > 0
        )))
  );
}
