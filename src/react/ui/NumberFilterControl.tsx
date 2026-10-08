import { useState } from 'react';
import {
  numberOperatorLabels,
  type NumberFilter,
  type NumberOperator,
  type NumberSelection,
} from '@/src/core/filters';
import { Select } from '@/src/react/ui/Select';
import { NumberField, NumberRangeField } from '@/src/react/ui/NumberField';
import { FilterBar } from '@/src/react/ui/FilterBar';

type Mode = 'all' | 'range' | NumberOperator;
function selectionMode(value: NumberSelection): Mode {
  return value.kind === 'comparison' ? value.operator : value.kind;
}
/** Draft an operator until it has a valid value; only complete predicates reach URL/query state. */
export function NumberFilterControl({
  filter,
  value,
  onChange,
}: {
  filter: NumberFilter;
  value: NumberSelection;
  onChange: (value: NumberSelection) => void;
}) {
  const signature = JSON.stringify(value);
  const [previous, setPrevious] = useState(signature);
  const [mode, setMode] = useState<Mode>(selectionMode(value));
  if (previous !== signature) {
    setPrevious(signature);
    setMode(selectionMode(value));
  }
  return (
    <FilterBar aria-label={`${filter.label} filter`}>
      <Select
        label={filter.label}
        value={mode}
        options={[
          { id: 'all', label: 'Any' },
          { id: 'range', label: 'Between' },
          ...Object.entries(numberOperatorLabels).map(([id, label]) => ({
            id,
            label,
          })),
        ]}
        onChange={next => {
          setMode(next as Mode);
          if (next === 'all') onChange({ kind: 'all' });
          else if (next === 'range' && value.kind === 'comparison')
            onChange({ kind: 'range', min: value.value });
          else if (next !== 'range' && value.kind !== 'all')
            onChange({
              kind: 'comparison',
              operator: next as NumberOperator,
              value:
                value.kind === 'comparison'
                  ? value.value
                  : (value.min ?? value.max!),
            });
        }}
      />
      {mode === 'range' ? (
        <NumberRangeField
          label={`${filter.label} range`}
          value={value.kind === 'range' ? value : {}}
          min={filter.min}
          max={filter.max}
          onChange={range => {
            const next: NumberSelection =
              range.min === undefined && range.max === undefined
                ? { kind: 'all' }
                : { kind: 'range', ...range };
            if (filter.valid(next)) onChange(next);
          }}
        />
      ) : (
        mode !== 'all' && (
          <NumberField
            label={`${filter.label} value`}
            value={value.kind === 'comparison' ? value.value : null}
            minValue={filter.min}
            maxValue={filter.max}
            onChange={number => {
              const next: NumberSelection =
                number === null
                  ? { kind: 'all' }
                  : { kind: 'comparison', operator: mode, value: number };
              if (filter.valid(next)) onChange(next);
            }}
          />
        )
      )}
    </FilterBar>
  );
}
