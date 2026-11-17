// A bootstrap and its app may bundle independent copies in the same window.
const errorBrand = Symbol.for('@altertable/data-app/DataAppError');

export class DataAppError extends Error {
  readonly [errorBrand] = true;

  static override [Symbol.hasInstance](value: unknown): boolean {
    return (
      value instanceof Error &&
      (value as { [errorBrand]?: unknown })[errorBrand] === true
    );
  }

  constructor(
    message: string,
    public readonly code: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'DataAppError';
  }
}
