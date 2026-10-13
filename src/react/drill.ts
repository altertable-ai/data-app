import { invariant } from '@/src/core/invariant';

export type DetailTarget<Input> = {
  id: string;
  title: string;
  /** Validate both action inputs and untrusted shared URLs. Reuse the operation parser. */
  parseInput: (value: unknown) => Input;
};

export type DrillAction<Row, Input> = {
  id: string;
  label: string;
  /** @internal The metric or dataset that owns the action. */
  binding: object;
  /** @internal Opens a validated destination using this binding's displayed source. */
  resolve: (
    row: Row,
    input: Input
  ) => { target: object; id: string; input: unknown };
};

export function defineDrill<Row, Input, DetailInput>(
  definition: {
    id: string;
    label: string;
    target: DetailTarget<DetailInput>;
    input: (row: Row, displayedInput: Input) => NoInfer<DetailInput>;
  },
  binding: object
): DrillAction<Row, Input> {
  invariant(
    !!definition.id.trim() && !!definition.label.trim(),
    'Drill actions need an ID and label.'
  );
  return {
    id: definition.id,
    label: definition.label,
    binding,
    resolve(row, input) {
      return {
        target: definition.target,
        id: definition.target.id,
        input: definition.target.parseInput(definition.input(row, input)),
      };
    },
  };
}
