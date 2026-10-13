import type { DataOperations } from '@/src/core/operation-types';
import { invariant } from '@/src/core/invariant';

/** Input contracts contribute their required selector operations without overriding authored names. */
export function resolveOperations(authored: DataOperations): DataOperations {
  const operations = { ...authored };
  for (const operation of Object.values(authored)) {
    for (const [name, required] of Object.entries(
      operation.input.validation?.operations ?? {}
    )) {
      invariant(
        !Object.hasOwn(operations, name) || operations[name] === required,
        `Operation name is reserved by exploration: ${name}.`
      );
      operations[name] = required;
    }
  }
  return operations;
}
