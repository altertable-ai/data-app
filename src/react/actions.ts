import { invariant } from '@/src/core/invariant';
import type { HierarchyLevel, HierarchyPatch } from '@/src/core/hierarchy';
import {
  FilterTarget,
  HierarchyTarget,
  BreakdownTarget,
  targetAvailable,
  applyFilter,
  applyHierarchy,
  canDescend,
  descend,
} from '@/src/react/exploration';
import type { DetailView } from '@/src/react/details';
import type {
  ExplorationAction,
  ItemActions,
} from '@/src/react/ui/ExplorationActionControl';

type ActionCondition<Row> = { label?: string; when?: (row: Row) => boolean };
type DetailAction<Row, Input, DestinationInput> = ActionCondition<Row> & {
  label: string;
  target: DetailView<any, DestinationInput>;
  input: (row: Row, displayedInput: Input) => DestinationInput;
};
type FilterPatch<Target> =
  Target extends FilterTarget<infer Patch>
    ? Patch
    : Target extends HierarchyTarget<infer Levels>
      ? HierarchyPatch<Levels>
      : never;
type DescendAction<
  Row,
  Levels extends readonly HierarchyLevel[],
> = ActionCondition<Row> & {
  target: BreakdownTarget<Levels>;
  member: (
    row: Row
  ) => Levels[number]['valueType'] extends 'number' ? number : string | number;
};
export type DatasetAction<Row, Input> = ActionCondition<Row> &
  (
    | {
        kind: 'detail';
        target: DetailView<any, any>;
        input: (row: Row, input: Input) => unknown;
      }
    | { kind: 'filter'; target: object; values: (row: Row) => object }
    | {
        kind: 'descend';
        target: BreakdownTarget<any>;
        member: (row: Row) => string | number;
      }
  );
export class ActionBuilder<Row, Input> {
  detail<DestinationInput>(
    config: DetailAction<Row, Input, DestinationInput>
  ): DatasetAction<Row, Input> {
    return { ...config, kind: 'detail' };
  }
  filter<
    Target extends FilterTarget<any> | HierarchyTarget<any>,
    const Values extends FilterPatch<Target>,
  >(
    config: ActionCondition<Row> & {
      label: string;
      target: Target;
      values: (
        row: Row
      ) => Values &
        Record<Exclude<keyof Values, keyof FilterPatch<Target>>, never>;
    }
  ): DatasetAction<Row, Input> {
    return { ...config, kind: 'filter' };
  }
  descend<Levels extends readonly HierarchyLevel[]>(
    config: DescendAction<Row, Levels>
  ): DatasetAction<Row, Input> {
    return { ...config, kind: 'descend' };
  }
}
const actionSets = new WeakMap<
  object,
  {
    dataset: object;
    actions: Record<string, DatasetAction<any, any>>;
    primary?: string;
  }
>();
/** Actions are owned by one dataset; displayed rows and input are supplied by its widget. */
export class DatasetActions<Row, Input> {
  declare private row: Row;
  declare private input: Input;
}
export function defineDatasetActions<
  Row,
  Input,
  const Actions extends Record<string, DatasetAction<Row, Input>>,
>(
  dataset: object,
  build: (action: ActionBuilder<Row, Input>) => Actions,
  options?: { primary?: keyof Actions & string }
): DatasetActions<Row, Input> {
  const actions = build(new ActionBuilder<Row, Input>());
  invariant(
    !options?.primary || Object.hasOwn(actions, options.primary),
    'Primary action must be declared.'
  );
  const result = new DatasetActions<Row, Input>();
  actionSets.set(result, { dataset, actions, primary: options?.primary });
  return result;
}
export function resolveDatasetActions<Row, Input>(
  set: DatasetActions<Row, Input> | undefined,
  dataset: object,
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
  invariant(
    declaration?.dataset === dataset,
    'Actions must belong to the widget dataset.'
  );
  return row => {
    if (source.loading) return [];
    const input = source.input as Input;
    return Object.entries(declaration.actions).flatMap(
      ([id, action]): ExplorationAction[] => {
        if (action.when && !action.when(row)) return [];
        if (
          (action.kind === 'descend' ||
            (action.kind === 'filter' &&
              action.target instanceof HierarchyTarget)) &&
          (!targetAvailable(action.target, input, viewOwner!) ||
            (action.kind === 'descend' && !canDescend(action.target, input)))
        )
          return [];
        return [
          {
            id,
            label: action.label ?? 'Drill down',
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
              if (action.kind === 'descend') {
                if (
                  targetAvailable(action.target, input, viewOwner!) &&
                  canDescend(action.target, input)
                )
                  descend(action.target, action.member(row));
                return;
              }
              if (action.target instanceof HierarchyTarget) {
                if (targetAvailable(action.target, input, viewOwner!))
                  applyHierarchy(action.target, action.values(row));
              } else
                applyFilter(
                  action.target,
                  action.values(row) as Record<string, unknown>
                );
            },
          },
        ];
      }
    );
  };
}
