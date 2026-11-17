import { DataSourceError } from '../core/contract.ts';
import { registeredQueryRoute } from '../core/messages.ts';
import type { HostedLakehouse } from '../core/operation-types.ts';

const localQueryKey = Symbol.for('altertable.localQueryLakehouse');
type LocalQueryWindow = Window & { [localQueryKey]?: HostedLakehouse };

/** Send registered query IDs to the local Bun server; SQL never crosses this request. */
export function createLocalQueryLakehouse(
  endpoint = '/api/query',
  request: typeof fetch = fetch
): HostedLakehouse {
  return {
    async queryAllById(queryId, { limit, params, signal }) {
      const input = registeredQueryRoute.input({ queryId, limit, params });
      const response = await request(
        `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(queryId)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ limit, params }),
          signal,
        }
      );
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error('Invalid local query response.');
      }
      if (!response.ok) {
        const reason = (body as { reason?: unknown } | null)?.reason;
        if (
          reason === 'unauthorized' ||
          reason === 'forbidden' ||
          reason === 'rate_limited' ||
          reason === 'query_rejected' ||
          reason === 'unavailable'
        )
          throw new DataSourceError(reason, response.status);
        throw new Error('Local query failed.');
      }
      return registeredQueryRoute.output(body, input);
    },
  };
}

/** Install the local query adapter before mounting an app with browser-run operations. */
export function installLocalQueryLakehouse(
  frame: Window = window,
  lakehouse: HostedLakehouse = createLocalQueryLakehouse()
) {
  const target = frame as LocalQueryWindow;
  if (target[localQueryKey])
    throw new Error('A local query lakehouse is already installed.');
  target[localQueryKey] = lakehouse;
  return () => {
    if (target[localQueryKey] === lakehouse) delete target[localQueryKey];
  };
}

export function getLocalQueryLakehouse(frame: Window = window) {
  return (frame as LocalQueryWindow)[localQueryKey];
}
