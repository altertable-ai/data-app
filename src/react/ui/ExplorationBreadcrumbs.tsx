import { useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { ExplorationState } from '@/src/core/exploration';
import {
  parseFacetOptions,
  type DimensionSelection,
} from '@/src/core/dimension';
import type { ExplorationTarget } from '@/src/react/actions';
import { DimensionPicker } from '@/src/react/ui/DimensionPicker';
import { searchParams } from '@/src/react/ui/search';
import { writeVariableValues } from '@/src/react/ui/variables';

/** One hierarchy, rendered from applied input at page level and displayed input in widgets. */
export function ExplorationBreadcrumbs({
  target,
  id,
  value,
  local = false,
}: {
  target: Pick<
    ExplorationTarget<any>,
    'variable' | 'clientScope' | 'loadFacet'
  >;
  id?: string;
  value: ExplorationState<any>;
  local?: boolean;
}) {
  const navigation = useRef<HTMLElement>(null);
  const { variable } = target;
  const state = variable.parse(value);
  const stale = local && !variable.same(state, variable.read(searchParams()));
  const group = variable.levels.findIndex(level => level.id === state.groupBy);
  const shown = variable.levels.slice(0, group + 1);
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
  function commit(next: ExplorationState<any>, focus = false) {
    writeVariableValues(
      { exploration: variable },
      { exploration: next },
      'push'
    );
    if (focus) navigation.current?.focus({ preventScroll: true });
  }
  return (
    <nav
      ref={navigation}
      id={id}
      tabIndex={-1}
      className="altertable-exploration-breadcrumbs"
      aria-label={`${variable.label} ${local ? 'breakdown' : 'exploration'}`}
      data-exploration-navigation={local || undefined}
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
              aria-current={position === group ? 'page' : undefined}
            >
              {position > 0 && (
                <span
                  className="altertable-exploration-separator"
                  aria-hidden="true"
                >
                  /
                </span>
              )}
              <DimensionPicker
                filter={dimension}
                variant="ghost"
                disabled={stale}
                value={state.selection[level.id] as DimensionSelection}
                options={facet.data ?? options ?? dimension.options}
                loading={!!level.facet && facet.isPending}
                error={!!level.facet && facet.isError}
                onRetry={() => void facet.refetch()}
                labelAction={
                  position < group
                    ? () => commit(variable.navigate(state, level.id), true)
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
