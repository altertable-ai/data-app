import { invariant } from '@/src/core/invariant';

export function validateWidgetViews(
  views: readonly { id: string }[],
  selected: string
) {
  const ids = new Set(views.map(view => view.id));
  // oxlint-disable-next-line data-app/no-runtime-assertion -- Tab IDs are an authoring contract.
  invariant(
    views.length > 0 &&
      ids.size === views.length &&
      views.every(view => !!view.id.trim()),
    'Widget tab IDs must be nonempty and unique.'
  );
  // oxlint-disable-next-line data-app/no-runtime-assertion -- Tab IDs are an authoring contract.
  invariant(ids.has(selected), `Unknown widget tab: ${selected}.`);
}
