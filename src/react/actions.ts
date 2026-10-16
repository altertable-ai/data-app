import { invariant } from '@/src/core/invariant';
import {
  FilterTarget,
  BreakdownTarget,
  targetAvailable,
  applyFilter,
  filterApplicable,
} from '@/src/react/exploration';
import type { DetailView } from '@/src/react/details';
import type {
  ExplorationAction,
  ItemActions,
} from '@/src/react/ui/ExplorationActionControl';

type ActionCondition<Row> = { label: string; when?: (row: Row) => boolean };
type DetailAction<Row, Input, DestinationInput> = ActionCondition<Row> & {
  label: string;
  target: DetailView<any, DestinationInput>;
  input: (row: Row, displayedInput: Input) => DestinationInput;
};
export type ActionDeclaration<Row, Input> = ActionCondition<Row> &
  (
    | {
        kind: 'detail';
        target: DetailView<any, any>;
        input: (row: Row, input: Input) => unknown;
      }
    | {
        kind: 'filter';
        target: object;
        values: (row: Row) => object;
        breakdown?: {
          target: BreakdownTarget<any>;
          value: (row: Row) => string;
        };
      }
  );
export class ActionBuilder<Row, Input> {
  detail<DestinationInput>(
    config: DetailAction<Row, Input, DestinationInput>
  ): ActionDeclaration<Row, Input> {
    return { ...config, kind: 'detail' };
  }
  filter<
    Patch extends object,
    const Values extends NoInfer<Patch>,
    Value extends string = never,
  >(
    config: ActionCondition<Row> & {
      label: string;
      target: FilterTarget<Patch>;
      values: (row: Row) => Values & NoInfer<Patch>;
      breakdown?: {
        target: BreakdownTarget<Value>;
        value: (row: Row) => NoInfer<Value>;
      };
    }
  ): ActionDeclaration<Row, Input> {
    return { ...config, kind: 'filter' };
  }
}
const actionSets = new WeakMap<
  object,
  {
    binding: object;
    actions: Record<string, ActionDeclaration<any, any>>;
    primary?: string;
  }
>();
declare const actionTypes: unique symbol;

/** Actions belong to one metric or dataset; its widget supplies displayed rows and input. */
export class ExplorationActions<Row, Input> {
  declare readonly [actionTypes]: { row: Row; input: Input };
}
export function defineActions<
  Row,
  Input,
  const Actions extends Record<string, ActionDeclaration<Row, Input>>,
>(
  binding: object,
  build: (action: ActionBuilder<Row, Input>) => Actions,
  options?: { primary?: keyof Actions & string }
): ExplorationActions<Row, Input> {
  const actions = build(new ActionBuilder<Row, Input>());
  const result = new ExplorationActions<Row, Input>();
  actionSets.set(result, { binding, actions, primary: options?.primary });
  return result;
}
function filterArguments<Row>(
  action: Extract<ActionDeclaration<Row, unknown>, { kind: 'filter' }>,
  row: Row
) {
  return [
    action.target,
    action.values(row) as Record<string, unknown>,
    action.breakdown && {
      target: action.breakdown.target,
      value: action.breakdown.value(row),
    },
  ] as const;
}
export function resolveActions<Row, Input>(
  set: ExplorationActions<Row, Input> | undefined,
  binding: object,
  viewOwner: object | undefined,
  source: { loading?: boolean; input?: Input },
  open: (
    target: DetailView<any, any>,
    input: unknown,
    trigger?: HTMLElement | SVGElement
  ) => void
): ItemActions<Row> {
  if (!set) return () => [];
  const declaration = actionSets.get(set);
  // oxlint-disable-next-line data-app/no-runtime-assertion -- Ownership is object identity; same-shaped views share a type.
  invariant(
    declaration?.binding === binding,
    'Actions must belong to the widget metric or dataset.'
  );
  return row => {
    if (source.loading) return [];
    const input = source.input as Input;
    return Object.entries(declaration.actions).flatMap(
      ([id, action]): ExplorationAction[] => {
        if (action.when && !action.when(row)) return [];
        if (
          action.kind === 'filter' &&
          (!targetAvailable(action.target, input, viewOwner!) ||
            (action.breakdown &&
              !targetAvailable(action.breakdown.target, input, viewOwner!)) ||
            !filterApplicable(...filterArguments(action, row)))
        )
          return [];
        return [
          {
            id,
            label: action.label,
            primary: declaration.primary === id,
            onSelect(trigger) {
              if (action.kind === 'detail') {
                open(
                  action.target,
                  action.input(row, input),
                  trigger ??
                    (document.activeElement instanceof HTMLElement ||
                    document.activeElement instanceof SVGElement
                      ? document.activeElement
                      : undefined)
                );
                return;
              }
              if (
                targetAvailable(action.target, input, viewOwner!) &&
                (!action.breakdown ||
                  targetAvailable(action.breakdown.target, input, viewOwner!))
              )
                applyFilter(...filterArguments(action, row));
            },
          },
        ];
      }
    );
  };
}
