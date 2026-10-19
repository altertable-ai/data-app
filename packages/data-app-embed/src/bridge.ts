import {
  attachDataAppConnection,
  type DataAppConnectionOptions,
} from './host.ts';
import { attachDataAppSource, type DataAppSourceOptions } from './source.ts';

export type DataAppBridgeOptions =
  | (DataAppSourceOptions & {
      connection?: never;
      window?: never;
      javascript?: never;
    })
  | (DataAppConnectionOptions & { source?: never; startupTimeoutMs?: never });

/** Source mode configures and loads the iframe; connection mode attaches to a host-owned document. */
export function attachDataAppBridge(options: DataAppBridgeOptions) {
  return options.source
    ? attachDataAppSource(options)
    : attachDataAppConnection(options);
}
