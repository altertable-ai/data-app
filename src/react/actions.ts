import { invariant } from '@/src/core/invariant';
import type {
  ExplorationLevel,
  ExplorationState,
  ExplorationVariable,
} from '@/src/core/exploration';

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
export type ExplorationTarget<Input> = {
  kind: 'exploration';
  variable: Omit<ExplorationVariable<any>, 'levels'> & {
    levels: readonly (ExplorationLevel & { groupLabel: string })[];
  };
  navigationId: string;
  clientScope: string;
  loadFacet: (
    operation: string,
    input: unknown,
    signal: AbortSignal
  ) => Promise<unknown>;
  /** Extract the source view's preserved exploration state, including from nested input shapes. */
  read: (input: Input) => ExplorationState<any>;
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
      | ExplorationTarget<Input>
    );
    values: (row: Row) => Partial<NoInfer<Values>>;
  }): ExplorationAction<Row, Input>;
  descend(definition: {
    target: ExplorationTarget<Input>;
    member: (row: Row) => { id: string | number };
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
      const exploration = target.kind === 'exploration' ? target : undefined;
      return {
        label: row => (typeof label === 'function' ? label(row) : label),
        available: (row, input) =>
          (when?.(row) ?? true) &&
          (!exploration ||
            exploration.variable.same(
              exploration.read(input),
              exploration.variable.read(searchParams())
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
                'Wait for the displayed exploration before descending.'
              );
              const state = variable.descend(displayed, member(row).id);
              writeVariableValues(
                { exploration: variable },
                { exploration: state },
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
