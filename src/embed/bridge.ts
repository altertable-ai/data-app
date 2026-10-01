import {
  attachDataAppConnection,
  type DataAppConnectionOptions,
} from '@/src/embed/host';
import {
  attachDataAppSource,
  type DataAppSourceOptions,
} from '@/src/embed/source';

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
