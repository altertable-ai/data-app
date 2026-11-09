import {
  defineAppFilters,
  invariant,
  type FilterCollection,
} from '@altertable/data-app/internal';
import type { ReactNode } from 'react';

export type FilterControls = {
  searchControls: ReactNode;
  filterControls: ReactNode;
};

declare const collectionType: unique symbol;

/** The app's filters and display options, declared once with `defineFilters()`.
 * Each view reads all of them or a `pick()`; `<DataApp filters>` renders their controls. */
export class Filters<Collection extends FilterCollection = FilterCollection> {
  /** Carries the collection type for inference; never set at runtime. */
  declare readonly [collectionType]?: Collection;
  readonly #collection: Collection;
  readonly #root: Filters;
  readonly #useControls: (collection: FilterCollection) => FilterControls;

  private constructor(
    collection: Collection,
    root: Filters | undefined,
    useControls: (collection: FilterCollection) => FilterControls
  ) {
    this.#collection = collection;
    this.#root = root ?? (this as unknown as Filters);
    this.#useControls = useControls;
  }

  static create<Collection extends FilterCollection>(
    collection: Collection,
    useControls: (collection: FilterCollection) => FilterControls
  ): Filters<Collection> {
    return new Filters(defineAppFilters(collection), undefined, useControls);
  }

  /** The subset a view reads; it shares the app's URL state and controls. */
  pick<const Names extends readonly (keyof Collection & string)[]>(
    ...names: Names
  ): Filters<Pick<Collection, Names[number]>> {
    for (const name of names)
      invariant(name in this.#collection, `Unknown filter: ${name}.`);
    const picked = Object.fromEntries(
      names.map(name => [name, this.#collection[name]])
    ) as Pick<Collection, Names[number]>;
    return new Filters(picked, this.#root, this.#useControls);
  }

  static collection<Collection extends FilterCollection>(
    filters: Filters<Collection>
  ): Collection {
    return filters.#collection;
  }

  /** The `defineFilters()` result this set was picked from, or itself. */
  static root(filters: Filters<any>): Filters {
    return filters.#root;
  }

  /** Controls for every filter in the declaration, whichever subset is passed. */
  static useControls(filters: Filters<any>): FilterControls {
    return filters.#useControls(filters.#root.#collection);
  }
}
