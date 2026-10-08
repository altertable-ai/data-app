import { defineMessageRoute } from '@/src/core/messages';

export type DataAppAnnotationDraft = {
  id: string;
  target: {
    id: string;
    label: string;
    kind: 'widget' | 'element' | 'app';
    text: string;
    queryNames: string[];
    glossaryIds: string[];
  };
  context: {
    search: string;
    hash: string;
    displayedInput?: unknown;
    /** Normalized position within the selected target, stable across scrolling/resizing. */
    anchor?: { x: number; y: number };
    cursor?: { x: number; y: number };
    /** Normalized custom selection rectangle within the iframe document. */
    region?: { x: number; y: number; width: number; height: number };
    screenshot?: {
      mimeType: 'image/png';
      dataUrl: string;
      width: number;
      height: number;
    };
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
  pinsVisible?: boolean;
  showHint?: boolean;
  readOnly?: boolean;
  targets?: {
    id: string;
    targetId: string;
    number: number;
    comment?: string;
    anchor?: { x: number; y: number };
    region?: { x: number; y: number; width: number; height: number };
  }[];
  selectedAnnotationId?: string;
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
  if (
    target.kind !== 'widget' &&
    target.kind !== 'element' &&
    target.kind !== 'app'
  )
    throw new Error('Invalid annotation target.');
  let screenshot: DataAppAnnotationDraft['context']['screenshot'];
  if (context.screenshot !== undefined) {
    const image = object(context.screenshot);
    const dataUrl = text(image.dataUrl, 350_000, true);
    if (
      image.mimeType !== 'image/png' ||
      !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(dataUrl)
    )
      throw new Error('Invalid annotation screenshot.');
    const width = number(image.width, true);
    const height = number(image.height, true);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 1024 ||
      height > 1024
    )
      throw new Error('Invalid screenshot dimensions.');
    const encoded = dataUrl.slice('data:image/png;base64,'.length);
    if (
      encoded.length % 4 !== 0 ||
      (encoded.length / 4) * 3 -
        (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0) >
        262_144
    )
      throw new Error('Screenshot is too large.');
    const header = atob(encoded.slice(0, 44));
    if (header.length < 24 || header.slice(12, 16) !== 'IHDR')
      throw new Error('Invalid PNG header.');
    const bytes = Uint8Array.from(header, character => character.charCodeAt(0));
    const dimensions = new DataView(bytes.buffer);
    if (
      dimensions.getUint32(16) !== width ||
      dimensions.getUint32(20) !== height
    )
      throw new Error('Screenshot dimensions do not match the image.');
    screenshot = { mimeType: 'image/png', dataUrl, width, height };
  }
  let anchor: { x: number; y: number } | undefined;
  if (context.anchor !== undefined) {
    const point = object(context.anchor);
    const x = number(point.x, true);
    const y = number(point.y, true);
    if (x > 1 || y > 1) throw new Error('Invalid annotation anchor.');
    anchor = { x, y };
  }
  let cursor: { x: number; y: number } | undefined;
  if (context.cursor !== undefined) {
    const point = object(context.cursor);
    cursor = { x: number(point.x), y: number(point.y) };
  }
  let region: DataAppAnnotationDraft['context']['region'];
  if (context.region !== undefined) {
    const area = object(context.region);
    region = {
      x: number(area.x, true),
      y: number(area.y, true),
      width: number(area.width, true),
      height: number(area.height, true),
    };
    if (
      target.kind !== 'app' ||
      region.width <= 0 ||
      region.height <= 0 ||
      region.x + region.width > 1.000001 ||
      region.y + region.height > 1.000001
    )
      throw new Error('Invalid annotation selection.');
  }
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
      ...(anchor ? { anchor } : {}),
      ...(region ? { region } : {}),
      ...(cursor ? { cursor } : {}),
      ...(screenshot ? { screenshot } : {}),
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
  const json = JSON.stringify({
    ...draft,
    context: { ...draft.context, screenshot: undefined },
  });
  if (new TextEncoder().encode(json).byteLength > 12_000)
    throw new Error('Annotation is too large.');
  return JSON.parse(JSON.stringify(draft)) as DataAppAnnotationDraft;
}

export const annotationDraftRoute = /* @__PURE__ */ defineMessageRoute({
  input: parseDataAppAnnotationDraft,
  output(value: unknown): null {
    if (value !== null) throw new Error('Invalid annotation response.');
    return null;
  },
});

export const annotationEditorStateRoute = /* @__PURE__ */ defineMessageRoute({
  input(value: unknown): { hasUnsavedChanges: boolean } {
    const input = object(value);
    if (typeof input.hasUnsavedChanges !== 'boolean')
      throw new Error('Invalid annotation editor state.');
    return { hasUnsavedChanges: input.hasUnsavedChanges };
  },
  output(value: unknown): null {
    if (value !== null) throw new Error('Invalid annotation response.');
    return null;
  },
});

/** Request host-owned batch submission without transferring ownership of drafts. */
export const annotationSendRoute = /* @__PURE__ */ defineMessageRoute({
  input(value: unknown): null {
    if (value !== null) throw new Error('Invalid annotation send request.');
    return null;
  },
  output(value: unknown): null {
    if (value !== null) throw new Error('Invalid annotation response.');
    return null;
  },
});

export const annotationUpdateRoute = /* @__PURE__ */ defineMessageRoute({
  input(value: unknown): { id: string; comment: string } {
    const input = object(value);
    return {
      id: text(input.id, 128, true),
      comment: text(input.comment, 2000, true).trim(),
    };
  },
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
    (input.pinsVisible === undefined ||
      typeof input.pinsVisible === 'boolean') &&
    (input.showHint === undefined || typeof input.showHint === 'boolean') &&
    (input.readOnly === undefined || typeof input.readOnly === 'boolean') &&
    (input.selectedAnnotationId === undefined ||
      (typeof input.selectedAnnotationId === 'string' &&
        input.selectedAnnotationId.length <= 128)) &&
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
            target.number > 0 &&
            (target.anchor === undefined ||
              (typeof target.anchor.x === 'number' &&
                Number.isFinite(target.anchor.x) &&
                target.anchor.x >= 0 &&
                target.anchor.x <= 1 &&
                typeof target.anchor.y === 'number' &&
                Number.isFinite(target.anchor.y) &&
                target.anchor.y >= 0 &&
                target.anchor.y <= 1)) &&
            (target.region === undefined ||
              (typeof target.region === 'object' &&
                target.region !== null &&
                ['x', 'y', 'width', 'height'].every(key => {
                  const value = (target.region as Record<string, unknown>)[key];
                  return (
                    typeof value === 'number' &&
                    Number.isFinite(value) &&
                    value >= 0 &&
                    value <= 1
                  );
                }) &&
                target.region.width > 0 &&
                target.region.height > 0 &&
                target.region.x + target.region.width <= 1.000001 &&
                target.region.y + target.region.height <= 1.000001)) &&
            (target.comment === undefined ||
              (typeof target.comment === 'string' &&
                target.comment.length <= 2000))
        )))
  );
}
