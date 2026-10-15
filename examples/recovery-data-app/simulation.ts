import {
  DataSourceError,
  type Lakehouse,
  type QueryResult,
} from '@altertable/data-app/contract';

export type ResponseMode =
  | 'success'
  | 'zero'
  | 'empty'
  | 'busy'
  | 'unavailable'
  | 'forbidden'
  | 'rejected'
  | 'malformed';
export type SourceName = 'sales' | 'acquisition';

/** Inject at the public lakehouse boundary: normal operation parsing, cancellation and errors still run. */
export function createSimulation() {
  let revision = 0;
  const listeners = new Set<() => void>();
  const attempts = { sales: 0, acquisition: 0 };
  const modes: Record<SourceName, ResponseMode> = {
    sales: 'success',
    acquisition: 'success',
  };
  const pending = new Map<
    SourceName,
    { complete: () => void; abort: () => void }
  >();
  function changed() {
    revision++;
    for (const listener of listeners) listener();
  }
  const lakehouse: Lakehouse = {
    queryAll(statement, { signal, params }) {
      const name: SourceName = statement.includes('sales_fixture')
        ? 'sales'
        : 'acquisition';
      attempts[name]++;
      const attempt = attempts[name];
      return new Promise<QueryResult>((resolve, reject) => {
        function cleanup() {
          signal.removeEventListener('abort', abort);
          pending.delete(name);
        }
        function abort() {
          cleanup();
          reject(signal.reason);
          changed();
        }
        function complete() {
          cleanup();
          const mode = modes[name];
          if (
            mode === 'busy' ||
            mode === 'unavailable' ||
            mode === 'forbidden' ||
            mode === 'rejected'
          ) {
            reject(
              new DataSourceError(
                mode === 'busy'
                  ? 'rate_limited'
                  : mode === 'rejected'
                    ? 'query_rejected'
                    : mode
              )
            );
          } else {
            resolve({
              columns: [{ name: 'channel' }, { name: 'value' }],
              rows:
                mode === 'empty'
                  ? []
                  : [
                      [
                        params?.market === 'eu' ? 'Europe' : 'All markets',
                        mode === 'malformed'
                          ? 'invalid'
                          : mode === 'zero'
                            ? 0
                            : (name === 'sales' ? 1200 : 40) + attempt,
                      ],
                    ],
              queryId: `${name}-${attempt}`,
            });
          }
          changed();
        }
        pending.set(name, { complete, abort });
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
        else changed();
      });
    },
  };
  return {
    lakehouse,
    attempts,
    modes,
    pending,
    subscribe(this: void, listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => revision,
    complete(name: SourceName) {
      pending.get(name)?.complete();
    },
    setMode(name: SourceName, mode: ResponseMode) {
      modes[name] = mode;
      changed();
    },
  };
}
