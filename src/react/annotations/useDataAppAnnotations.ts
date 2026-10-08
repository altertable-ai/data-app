import { useState } from 'react';
import { createAnnotationClient } from '@/src/client/annotations';
import { getDataAppTransport } from '@/src/client/iframe';
import { MessageRoutingError } from '@/src/core/messages';

/** Bind annotation delivery to this app's current iframe bridge. The host owns storage and submission. */
export function useDataAppAnnotations() {
  const [client] = useState(() =>
    createAnnotationClient((message, signal) => {
      const transport = getDataAppTransport();
      if (!transport)
        throw new MessageRoutingError(
          'unsupported_route',
          'Annotations are unavailable in this app.'
        );
      return transport.request(message, signal);
    })
  );
  return client;
}
