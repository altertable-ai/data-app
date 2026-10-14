import type { MouseEventHandler } from 'react';
import { hasSelectedFacetLookup } from '@/src/core/hierarchy-source';
import { Button } from '@/src/react/ui/Button';
import { ControlLabelValue } from '@/src/react/ui/PickerField';
import { useQueries } from '@tanstack/react-query';
import type { HierarchyState } from '@/src/core/hierarchy';
import {
  parseFacetOptions,
  type DimensionSelection,
  type DimensionOption,
} from '@/src/core/dimension';
import type { HierarchyTarget } from '@/src/react/actions';
import { DimensionPicker } from '@/src/react/ui/DimensionPicker';

type HierarchyControls = {
  target: Pick<HierarchyTarget<any>, 'variable' | 'clientScope' | 'loadFacet'>;
  value: HierarchyState<any>;
};

function useHierarchyFacets({ target, value }: HierarchyControls) {
  const { variable } = target;
  const state = variable.parse(value);
  const shown: typeof variable.levels = variable.visibleLevels(state);
  function query(
    level: (typeof shown)[number],
    position: number,
    selected = false
  ) {
    const selections = Object.fromEntries(
      variable.levels.map((entry, index) => [
        entry.id,
        index < position || (selected && index === position)
          ? state.selection[entry.id]
          : { kind: 'all' as const },
      ])
    );
    const mapper =
      selected && !hasSelectedFacetLookup(level.facet)
        ? undefined
        : level.facet?.input;
    const input = mapper?.(selections);
    const enabled =
      !!mapper && (!selected || state.selection[level.id]?.kind !== 'all');
    return {
      queryKey: [
        'hierarchy-facet',
        target.clientScope,
        variable.urlKeys,
        level.id,
        level.facet?.operation,
        selected ? 'selected' : 'options',
        input,
      ],
      enabled,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        target
          .loadFacet(level.facet!.operation, input, signal)
          .then(result =>
            parseFacetOptions(result, variable.dimensions[position]!)
          ),
      staleTime: 60_000,
    };
  }
  const pages = useQueries({
    queries: shown.map((level, position) => query(level, position)),
  });
  const selected = useQueries({
    queries: shown.map((level, position) => query(level, position, true)),
  });
  const facets = pages.map((page, position) => {
    const member = selected[position]!;
    const data =
      page.data || member.data
        ? [
            ...new Map(
              [...(page.data ?? []), ...(member.data ?? [])].map(option => [
                option.value,
                option,
              ])
            ).values(),
          ]
        : undefined;
    return {
      data,
      isPending: page.isPending,
      isError: page.isError || member.isError,
      refetch: () =>
        Promise.all([
          page.refetch(),
          ...(member.isEnabled ? [member.refetch()] : []),
        ]),
    };
  });
  return { state, shown, facets };
}

/** Selected hierarchy members share the selectors' facet cache and labels. */
export function HierarchyFilterSummary({
  target,
  value,
  onEdit,
}: HierarchyControls & { onEdit: MouseEventHandler<HTMLButtonElement> }) {
  const { state, shown, facets } = useHierarchyFacets({ target, value });
  return shown.map((level, position) => {
    const selection = state.selection[level.id]!;
    const member = selection.kind === 'all' ? undefined : selection.members[0];
    if (member?.kind !== 'value') return null;
    const options: readonly DimensionOption[] =
      facets[position]!.data ?? level.options ?? [];
    const label =
      options.find(option => option.value === member.value)?.label ??
      String(member.value);
    return (
      <Button
        key={level.id}
        variant="ghost"
        onClick={onEdit}
        aria-label={`Edit ${level.label}: ${label}`}
      >
        <ControlLabelValue label={level.label} value={label} />
      </Button>
    );
  });
}

/** Progressive hierarchy selectors, owned by the view's filters sheet. */
export function HierarchyFilters({
  target,
  id,
  value,
  onChange,
}: HierarchyControls & {
  id?: string;
  onChange: (value: HierarchyState<any>) => void;
}) {
  const { variable } = target;
  const { state, shown, facets } = useHierarchyFacets({ target, value });
  return (
    <nav
      id={id}
      tabIndex={-1}
      className="altertable-field altertable-hierarchy-filters"
      data-label-placement="above"
      aria-label={`${variable.label} hierarchy`}
    >
      <span className="altertable-field-label">{variable.label}</span>
      <ol>
        {shown.map((level, position) => {
          const dimension = variable.dimensions[position]!;
          const parent = position
            ? state.selection[variable.levels[position - 1]!.id]
            : undefined;
          const parentValue =
            parent &&
            parent.kind !== 'all' &&
            parent.members[0]?.kind === 'value'
              ? parent.members[0].value
              : null;
          const options = level.options?.filter(
            option =>
              option.parent === undefined || option.parent === parentValue
          );
          const facet = facets[position]!;
          return (
            <li
              key={level.id}
              style={{
                marginInlineStart: `calc(${position} * var(--atbl-space-lg))`,
                maxInlineSize: `calc(100% - ${position} * var(--atbl-space-lg))`,
              }}
            >
              <DimensionPicker
                filter={dimension}
                value={state.selection[level.id] as DimensionSelection}
                options={facet.data ?? options ?? dimension.options}
                loading={!!level.facet && facet.isPending}
                error={!!level.facet && facet.isError}
                onRetry={() => void facet.refetch()}
                onChange={next => {
                  const member =
                    next.kind === 'all' ? undefined : next.members[0];
                  onChange(
                    variable.filter(state, {
                      [level.id]:
                        member?.kind === 'value' ? member.value : null,
                    })
                  );
                }}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
