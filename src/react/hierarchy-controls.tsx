import { useQueries } from '@tanstack/react-query';
import {
  hierarchySelectorName,
  selectedMember,
  type HierarchyVariable,
  type HierarchyScope,
} from '@/src/core/hierarchy';
import type { DimensionOption } from '@/src/core/dimension';
import { ChoicePicker } from '@/src/react/ui/ChoicePicker';
import { Stack } from '@/src/react/ui/Stack';
import type { ReactNode } from 'react';
import type { VariableCollection } from '@/src/core/variables';

/** One exact lookup supplies selected labels to both controls and floating summaries. */
export function useHierarchyControls(
  definitions: VariableCollection,
  values: Record<string, unknown>,
  clientScope: string,
  load: (
    operation: string,
    input: unknown,
    signal: AbortSignal
  ) => Promise<unknown>,
  set: (name: string, value: any) => void
) {
  const levels = Object.entries(definitions).flatMap(([name, definition]) => {
    if (definition.kind !== 'hierarchy') return [];
    const hierarchy = definition as HierarchyVariable;
    const scope = values[name] as HierarchyScope<
      readonly import('@/src/core/hierarchy').HierarchyLevel[]
    >;
    return hierarchy.levels.flatMap((level, index) => {
      if (
        index > 0 &&
        selectedMember(scope, hierarchy.levels[index - 1]!.id) === null
      )
        return [];
      // Only ancestors affect the option population and selected-member label.
      const ancestors = hierarchy.transition(scope, { [level.id]: null });
      return [
        {
          name,
          hierarchy,
          scope,
          ancestors,
          level,
          index,
          selected: selectedMember(scope, level.id),
        },
      ];
    });
  });
  const requests = levels.flatMap(item =>
    item.level.source
      ? [
          { item, member: null },
          ...(item.selected === null ? [] : [{ item, member: item.selected }]),
        ]
      : []
  );
  const queries = useQueries({
    queries: requests.map(({ item, member }) => ({
      queryKey: [
        'hierarchy-options',
        clientScope,
        item.hierarchy.key,
        item.level.id,
        item.ancestors,
        member,
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        load(
          hierarchySelectorName(item.hierarchy, item.level),
          { scope: item.ancestors, member },
          signal
        ) as Promise<DimensionOption[]>,
      staleTime: 60_000,
      gcTime: 300_000,
    })),
  });
  const controls = new Map<string, { control: ReactNode; summary: string }>();
  for (const [name, definition] of Object.entries(definitions)) {
    if (definition.kind !== 'hierarchy') continue;
    const labels: string[] = [];
    const children = levels
      .filter(item => item.name === name)
      .map(item => {
        const { hierarchy, level, scope, selected, index } = item;
        const optionsIndex = requests.findIndex(
          request => request.item === item && request.member === null
        );
        const selectedIndex = requests.findIndex(
          request => request.item === item && request.member !== null
        );
        const optionsQuery =
          optionsIndex < 0 ? undefined : queries[optionsIndex];
        const selectedQuery =
          selectedIndex < 0 ? undefined : queries[selectedIndex];
        const parent =
          index === 0
            ? null
            : selectedMember(scope, hierarchy.levels[index - 1]!.id);
        const options = [
          ...(optionsQuery?.data ??
            level.options?.filter(
              option => index === 0 || option.parent === parent
            ) ??
            []),
        ];
        const exact = selectedQuery?.data?.find(
          option => option.value === selected
        );
        const selectedOption =
          exact ?? options.find(option => option.value === selected);
        if (selected !== null) {
          labels.push(selectedOption?.label ?? String(selected));
          if (!options.some(option => option.value === selected))
            options.unshift(
              selectedOption ?? { value: selected, label: String(selected) }
            );
          else if (exact)
            options[options.findIndex(option => option.value === selected)] =
              exact;
        }
        return (
          <ChoicePicker
            key={level.id}
            selectionMode="single"
            label={level.label}
            labelPlacement="above"
            value={selected === null ? 'all' : JSON.stringify(selected)}
            options={[
              { id: 'all', label: 'All' },
              ...options.map(option => ({
                id: JSON.stringify(option.value),
                label: option.label,
                description:
                  option.count === undefined
                    ? undefined
                    : `${option.count.toLocaleString()} matches`,
              })),
            ]}
            loading={!!optionsQuery?.isPending}
            error={!!optionsQuery?.isError}
            onRetry={() => {
              void optionsQuery?.refetch();
              void selectedQuery?.refetch();
            }}
            onChange={id =>
              set(
                name,
                hierarchy.transition(scope, {
                  [level.id]: id === 'all' ? null : JSON.parse(id),
                })
              )
            }
          />
        );
      });
    controls.set(name, {
      control: <Stack key={name}>{children}</Stack>,
      summary: labels.join(' / ') || `All ${definition.label}`,
    });
  }
  return controls;
}
