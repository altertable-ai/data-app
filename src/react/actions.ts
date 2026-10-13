import { invariant } from '@/src/core/invariant';
import type {
  BreakdownMember,
  BreakdownPath,
  BreakdownVariable,
} from '@/src/core/breakdown';
import { searchParams } from '@/src/react/ui/search';
import { writeVariableValues } from '@/src/react/ui/variables';

export type DetailTarget<Input> = {
  id: string;
  title: string;
  parseInput: (value: unknown) => Input;
};
export type DetailRequest = { target: object; id: string; input: unknown };
export type BreakdownTarget<Input> = {
  variable: BreakdownVariable;
  navigationId: string;
  /** Extract the source view's preserved path, including from nested input shapes. */
  read: (input: Input) => BreakdownPath;
};
type ActionRequest =
  | { kind: 'detail'; detail: DetailRequest }
  | { kind: 'update'; apply: () => void; navigation?: string };
export type ExplorationAction<Row, Input> = {
  /** Hierarchy context is rendered by the bound widget, including at terminal levels. */
  breakdown?: BreakdownTarget<Input>;
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
    target: { filter: (values: Partial<Values>) => void };
    values: (row: Row) => Partial<NoInfer<Values>>;
  }): ExplorationAction<Row, Input>;
  descend(definition: {
    target: BreakdownTarget<Input>;
    member: (row: Row) => Pick<BreakdownMember, 'id' | 'label'>;
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
            detail: {
              target,
              id: target.id,
              input: target.parseInput(input(row, displayedInput)),
            },
          };
        },
      };
    },
    filter({ label, target, values, when }) {
      return {
        label: row => (typeof label === 'function' ? label(row) : label),
        available: row => when?.(row) ?? true,
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
        breakdown: target,
        label(_row, input) {
          return `Break down by ${variable.levels[target.read(input).length + 1]?.label.toLowerCase() ?? 'a finer level'}`;
        },
        available(_row, input) {
          const displayed = variable.parse(target.read(input));
          return (
            displayed.length < variable.levels.length - 1 &&
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
                'Wait for the displayed breakdown before descending.'
              );
              const path = variable.parse([
                ...displayed,
                { ...member(row), level: variable.level(displayed).id },
              ]);
              writeVariableValues({ path: variable }, { path }, 'push');
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
  const breakdowns = entries.flatMap(entry =>
    entry.effect.breakdown ? [entry.effect.breakdown] : []
  );
  invariant(
    breakdowns.every(
      target =>
        target.variable === breakdowns[0]?.variable &&
        target.navigationId === breakdowns[0]?.navigationId
    ),
    'A widget action set must explore one hierarchy.'
  );
  return { binding, entries, primary: options.primary };
}
