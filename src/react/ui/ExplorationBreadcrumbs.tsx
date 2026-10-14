import { useRef } from 'react';
import { Button } from '@/src/react/ui/Button';
import { useQueries } from '@tanstack/react-query';
import type { ExplorationState } from '@/src/core/exploration';
import {
  parseFacetOptions,
  type DimensionSelection,
  type DimensionOption,
} from '@/src/core/dimension';
import type { ExplorationTarget } from '@/src/react/actions';
import { DimensionPicker } from '@/src/react/ui/DimensionPicker';
import { searchParams } from '@/src/react/ui/search';
import { writeVariableValues } from '@/src/react/ui/variables';

type ExplorationControls = {
  target: Pick<
    ExplorationTarget<any>,
    'variable' | 'clientScope' | 'loadFacet'
  >;
  value: ExplorationState<any>;
};

function useExplorationFacets({ target, value }: ExplorationControls) {
  const { variable } = target;
  const state = variable.parse(value);
  const shown: typeof variable.levels = variable.visibleLevels(state);
  const facets = useQueries({
    queries: shown.map((level, position) => {
      const parents = Object.fromEntries(
        variable.levels.map((entry, index) => [
          entry.id,
          index < position
            ? state.selection[entry.id]
            : { kind: 'all' as const },
        ])
      );
      const input = level.facet?.input(parents);
      return {
        queryKey: [
          'exploration-facet',
          target.clientScope,
          variable.urlKeys,
          level.id,
          level.facet?.operation,
          input,
        ],
        enabled: !!level.facet,
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          target
            .loadFacet(level.facet!.operation, input, signal)
            .then(result =>
              parseFacetOptions(result, variable.dimensions[position]!)
            ),
        staleTime: 60_000,
      };
    }),
  });
  return { state, shown, facets };
}

/** Selected hierarchy members share the selectors' facet cache and labels. */
export function ExplorationFilterSummary({
  target,
  value,
  onEdit,
}: ExplorationControls & { onEdit: () => void }) {
  const { state, shown, facets } = useExplorationFacets({ target, value });
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
        <span className="altertable-filter-summary-label">{level.label}</span>{' '}
        {label}
      </Button>
    );
  });
}

/** Progressive hierarchy selectors, owned by the view's filters sheet. */
export function ExplorationBreadcrumbs({
  target,
  id,
  value,
}: ExplorationControls & { id?: string }) {
  const navigation = useRef<HTMLElement>(null);
  const { variable } = target;
  const { state, shown, facets } = useExplorationFacets({ target, value });
  const group = variable.levels.findIndex(level => level.id === state.groupBy);
  function commit(next: ExplorationState<any>, focus = false) {
    writeVariableValues(
      { exploration: variable },
      { exploration: next },
      'push'
    );
    if (focus)
      requestAnimationFrame(() =>
        navigation.current?.focus({ preventScroll: true })
      );
  }
  return (
    <nav
      ref={navigation}
      id={id}
      tabIndex={-1}
      className="altertable-exploration-breadcrumbs"
      aria-label={`${variable.label} exploration`}
    >
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
                marginInlineStart: `calc(${position} * var(--atbl-space-md))`,
                maxInlineSize: `calc(100% - ${position} * var(--atbl-space-md))`,
              }}
              aria-current={position === group ? 'page' : undefined}
            >
              <DimensionPicker
                filter={dimension}
                value={state.selection[level.id] as DimensionSelection}
                options={facet.data ?? options ?? dimension.options}
                loading={!!level.facet && facet.isPending}
                error={!!level.facet && facet.isError}
                onRetry={() => void facet.refetch()}
                action={
                  position < group
                    ? {
                        label: `Group by ${level.label}`,
                        onAction: () =>
                          commit(variable.navigate(state, level.id), true),
                      }
                    : undefined
                }
                onChange={next => {
                  const member =
                    next.kind === 'all' ? undefined : next.members[0];
                  commit(
                    variable.filter(variable.read(searchParams()), {
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
