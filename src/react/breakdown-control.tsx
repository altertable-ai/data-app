import type { BreakdownTarget } from '@/src/react/actions';
import type { ViewSource } from '@/src/react/bindings';
import { Select } from '@/src/react/ui/Select';
import { searchParams } from '@/src/react/ui/search';
import { writeVariableValues } from '@/src/react/ui/variables';

/** Chart-owned aggregation; its choices and label describe the displayed population. */
export function BreakdownControl<Input>({
  target,
  source,
}: {
  target: BreakdownTarget<Input>;
  source: ViewSource<unknown, Input>;
}) {
  const { variable, breakdown } = target;
  const scope = source.loading
    ? variable.defaultValue
    : target.read(source.input);
  const level = source.loading
    ? breakdown.defaultValue
    : target.readLevel(source.input);
  return (
    <Select
      id={target.navigationId}
      label="Break down by"
      labelPlacement="inline"
      value={level}
      disabled={source.loading}
      options={variable
        .visibleLevels(scope)
        .map(entry => ({ id: entry.id, label: entry.label }))}
      onChange={id => {
        const current = variable.read(searchParams());
        if (
          !variable.same(scope, current) ||
          level !== breakdown.read(searchParams())
        )
          return;
        writeVariableValues(
          { breakdown },
          { breakdown: breakdown.level(id, current).id },
          'push'
        );
      }}
    />
  );
}
