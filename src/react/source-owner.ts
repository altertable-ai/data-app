import { invariant } from '@/src/core/invariant';

// Ownership follows the source object supplied by content, stories, or exports.
const owners = new WeakMap<object, object>();

export function ownedSource<Source extends object>(
  owner: object,
  source: Source
): Source {
  const displayed = { ...source };
  owners.set(displayed, owner);
  return displayed;
}

export function assertSourceOwner(owner: object, source: object): void {
  invariant(
    owners.get(source) === owner,
    'A binding requires the displayed source from its own view.'
  );
}
