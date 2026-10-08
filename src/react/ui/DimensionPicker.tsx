import type {
  DimensionMember,
  DimensionOption,
  DimensionSelection,
  DimensionValue,
  DimensionVariable,
} from '@/src/core/dimension';
import { dimensionMemberKey } from '@/src/core/dimension';
import { invariant } from '@/src/core/invariant';
import { ChoicePicker, type ChoiceOption } from '@/src/react/ui/ChoicePicker';
import { Select } from '@/src/react/ui/Select';
import { FilterBar } from '@/src/react/ui/FilterBar';

const allKey = 'all';

/** Adapts the typed dimension contract to the shared ChoicePicker control. */
export function DimensionPicker<T extends DimensionValue>({
  filter,
  value,
  onChange,
  options: suppliedOptions,
  loading = false,
  error = false,
  onRetry,
}: {
  filter: DimensionVariable<T>;
  value: DimensionSelection<T>;
  onChange: (value: DimensionSelection<T>) => void;
  options?: readonly DimensionOption<T>[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const members = value.kind === 'all' ? [] : value.members;
  const mode = value.kind === 'exclude' ? 'exclude' : 'include';
  const available = [...(suppliedOptions ?? filter.options)];
  for (const member of members)
    if (
      member.kind === 'value' &&
      !available.some(option => option.value === member.value)
    )
      available.unshift({
        value: member.value,
        label: String(member.value),
        count: 0,
      });

  const byKey = new Map<string, DimensionMember<T>>();
  const choices: ChoiceOption[] = available.map(option => {
    const member = { kind: 'value' as const, value: option.value };
    const id = dimensionMemberKey(member);
    byKey.set(id, member);

    return {
      id,
      label: option.label,
      description:
        option.count === undefined
          ? undefined
          : `${option.count.toLocaleString()} matches`,
    };
  });
  let missingOption: ChoiceOption | undefined;
  if (filter.allowMissing) {
    const member = { kind: 'missing' as const };
    const id = dimensionMemberKey(member);
    byKey.set(id, member);
    missingOption = {
      id,
      label: 'No value',
      description: `Records without a ${filter.label.toLocaleLowerCase()} value`,
    };
  }

  const picker =
    filter.selectionMode === 'single' ? (
      <ChoicePicker
        selectionMode="single"
        label={filter.label}
        value={members.length ? dimensionMemberKey(members[0]!) : allKey}
        onChange={(id: string) => {
          if (id === allKey) return onChange({ kind: 'all' });
          const member = byKey.get(id);
          invariant(member, `Unknown ${filter.label} option.`);
          onChange({ kind: mode, members: [member] });
        }}
        options={[{ id: allKey, label: 'All' }, ...choices]}
        missingOption={missingOption}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={error ? 'Couldn’t load values' : 'No matching values'}
      />
    ) : (
      <ChoicePicker
        selectionMode="multiple"
        label={filter.label}
        values={members.map(dimensionMemberKey)}
        onChange={(ids: string[]) => {
          if (!ids.length) return onChange({ kind: 'all' });
          const selected = ids.map(id => {
            const member = byKey.get(id);
            invariant(member, `Unknown ${filter.label} option.`);

            return member;
          });
          onChange({ kind: mode, members: selected });
        }}
        options={choices}
        missingOption={missingOption}
        maxSelected={filter.maxSelected}
        emptySelectionLabel="All"
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
    );
  return filter.allowExclusion ? (
    <FilterBar aria-label={`${filter.label} filter`}>
      <Select
        label={`${filter.label} matching`}
        value={mode}
        options={[
          { id: 'include', label: 'Include' },
          { id: 'exclude', label: 'Exclude' },
        ]}
        onChange={next => {
          if (members.length)
            onChange({ kind: next as 'include' | 'exclude', members });
        }}
        disabled={!members.length}
      />
      {picker}
    </FilterBar>
  ) : (
    picker
  );
}
