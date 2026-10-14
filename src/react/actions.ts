import { invariant } from '@/src/core/invariant';
import type {
  HierarchyLevel,
  HierarchyState,
  HierarchyVariable,
} from '@/src/core/hierarchy';

import { searchParams } from '@/src/react/ui/search';
import { writeVariableValues } from '@/src/react/ui/variables';

export type DetailTarget<Input> = {
  id: string;
  title: string;
  parseInput: (value: unknown) => Input;
};
export type DetailRequest = { target: object; id: string; input: unknown };
/** Normalize destination input once for record tabs and explicit detail actions. */
export function detailRequest<Input>(
  target: DetailTarget<Input>,
  input: NoInfer<Input>
): DetailRequest {
  return { target, id: target.id, input: target.parseInput(input) };
}
export type HierarchyTarget<Input> = {
  kind: 'hierarchy';
  variable: Omit<HierarchyVariable<any>, 'levels'> & {
    levels: readonly (HierarchyLevel & { groupLabel: string })[];
  };
  navigationId: string;
  clientScope: string;
  loadFacet: (
    operation: string,
    input: unknown,
    signal: AbortSignal
  ) => Promise<unknown>;
  /** Extract the source view's preserved hierarchy state, including from nested input shapes. */
  read: (input: Input) => HierarchyState<any>;
};
type ActionRequest =
  | { kind: 'detail'; detail: DetailRequest }
  | { kind: 'update'; apply: () => void; navigation?: string };
export type ExplorationAction<Row, Input> = {
  label: (row: Row, displayedInput: Input) => string;
  available: (row: Row, displayedInput: Input) => boolean;
  resolve: (row: Row, displayedInput: Input) => ActionRequest;
};
export type ExplorationActions<Row, Input> = {
  binding: object;
  entries: readonly { id: string; effect: ExplorationAction<Row, Input> }[];
  primary?: string;
};
export type ActionFactory<Row, Input> = {
  detail<DetailInput>(definition: {
    label: string;
    target: DetailTarget<DetailInput>;
    input: (row: Row, displayedInput: Input) => NoInfer<DetailInput>;
  }): ExplorationAction<Row, Input>;
  filter<Values extends object>(definition: {
    label: string | ((row: Row) => string);
    when?: (row: Row) => boolean;
    target: { filter: (values: Partial<Values>) => void } & (
      | { kind?: never }
      | HierarchyTarget<Input>
    );
    values: (row: Row) => Partial<NoInfer<Values>>;
  }): ExplorationAction<Row, Input>;
  descend(definition: {
    target: HierarchyTarget<Input>;
    member: (row: Row) => string | number;
  }): ExplorationAction<Row, Input>;
};

export function actionFactory<Row, Input>(): ActionFactory<Row, Input> {
  return {
    detail({ label, target, input }) {
      return {
        label: () => label,
        available: () => true,
        resolve(row, displayedInput) {
          return {
            kind: 'detail',
            detail: detailRequest(target, input(row, displayedInput)),
          };
        },
      };
    },
    filter({ label, target, values, when }) {
      const hierarchy = target.kind === 'hierarchy' ? target : undefined;
      return {
        label: row => (typeof label === 'function' ? label(row) : label),
        available: (row, input) =>
          (when?.(row) ?? true) &&
          (!hierarchy ||
            hierarchy.variable.same(
              hierarchy.read(input),
              hierarchy.variable.read(searchParams())
            )),
        resolve(row) {
          return {
            kind: 'update',
            apply() {
              target.filter(values(row));
            },
          };
        },
      };
    },
    descend({ target, member }) {
      const { variable } = target;
      return {
        label(_row, input) {
          return `Break down by ${variable.levels[variable.levels.findIndex(level => level.id === target.read(input).groupBy) + 1]?.groupLabel.toLowerCase() ?? 'a finer level'}`;
        },
        available(_row, input) {
          const displayed = variable.parse(target.read(input));
          return (
            displayed.groupBy !== variable.levels.at(-1)!.id &&
            variable.same(displayed, variable.read(searchParams()))
          );
        },
        resolve(row, input) {
          return {
            kind: 'update',
            navigation: target.navigationId,
            apply() {
              const displayed = variable.parse(target.read(input));
              invariant(
                variable.same(displayed, variable.read(searchParams())),
                'Wait for the displayed hierarchy before descending.'
              );
              const state = variable.descend(displayed, member(row));
              writeVariableValues(
                { hierarchy: variable },
                { hierarchy: state },
                'push'
              );
            },
          };
        },
      };
    },
  };
}

/** Stable named actions with contextual row/input typing; a primary action is an explicit UX choice. */
export function defineActions<
  Row,
  Input,
  const Entries extends Record<string, ExplorationAction<Row, Input>>,
>(
  binding: object,
  build: (action: ActionFactory<Row, Input>) => Entries,
  options: { primary?: keyof NoInfer<Entries> & string } = {}
): ExplorationActions<Row, Input> {
  const entries = Object.entries(build(actionFactory<Row, Input>())).map(
    ([id, effect]) => ({ id, effect })
  );
  invariant(
    entries.length > 0 && entries.every(entry => !!entry.id.trim()),
    'Exploration actions need nonempty IDs.'
  );
  invariant(
    !options.primary || entries.some(entry => entry.id === options.primary),
    'The primary action must be declared.'
  );
  return { binding, entries, primary: options.primary };
}
