import {
  getDataAppTransport,
  type IframeTransport,
} from '@altertable/data-app/client';
import { localFrameBridge } from '@altertable/data-app/internal';
import { useEffect, useState } from 'react';

/** The parent bridge, once installed or verified; undefined for standalone pages. */
export function useDataAppTransport() {
  const [transport, setTransport] = useState<IframeTransport | undefined>(
    getDataAppTransport
  );

  useEffect(() => {
    if (transport) return;
    let disposed = false;
    void localFrameBridge()
      ?.connect?.()
      .then(bridge => {
        if (!disposed) setTransport(bridge);
      })
      .catch(() => {});

    return () => {
      disposed = true;
    };
  }, [transport]);

  return transport;
}
