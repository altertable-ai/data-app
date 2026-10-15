/** Compare inferred results with their JSON representation without declaring another schema. */
export type JsonData<Value> = 0 extends 1 & Value
  ? never
  : unknown extends Value
    ? never
    : Value extends string | number | boolean | null
      ? Value
      : Value extends (...args: never[]) => unknown
        ? never
        : Value extends readonly unknown[]
          ? undefined extends Value[number]
            ? never
            : { [Key in keyof Value]: JsonData<Value[Key]> }
          : Value extends object
            ? Extract<keyof Value, symbol> extends never
              ? { [Key in keyof Value]: JsonData<Value[Key]> }
              : never
            : never;

/** Verify the shared serialization boundary, including values TypeScript cannot prove finite. */
export function assertJsonData(value: unknown): void {
  const ancestors = new Set<object>();

  function visit(value: unknown): void {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean'
    )
      return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || value === null)
      throw new Error('Operation results must be JSON data.');
    if (ancestors.has(value))
      throw new Error('Operation results cannot contain cycles.');

    const array = Array.isArray(value);
    const prototype: unknown = Object.getPrototypeOf(value);
    if (!array && prototype !== Object.prototype && prototype !== null)
      throw new Error('Operation results must contain plain objects.');
    const keys = Reflect.ownKeys(value);
    if (array && keys.length !== value.length + 1)
      throw new Error(
        'Operation result arrays must be dense and contain only indexed values.'
      );
    ancestors.add(value);
    const fields = array
      ? Array.from({ length: value.length }, (_, index) => String(index))
      : keys;
    for (const key of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        typeof key !== 'string' ||
        !descriptor?.enumerable ||
        !('value' in descriptor)
      )
        throw new Error(
          'Operation results must contain enumerable data fields.'
        );
      const field: unknown = descriptor.value;
      // Optional object fields may be omitted by JSON; array entries must retain their position/type.
      if (!array && field === undefined) continue;
      visit(field);
    }
    ancestors.delete(value);
  }

  visit(value);
}
