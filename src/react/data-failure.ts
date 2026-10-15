import { DataAppError } from '@/src/client/transport';

const failures = {
  source_unauthorized: {
    title: 'Connection needs attention',
    message: 'Ask the app owner to reconnect the lakehouse.',
    retryable: false,
  },
  source_forbidden: {
    title: 'Data access denied',
    message:
      'The selected profile cannot read this data. Ask the app owner for access.',
    retryable: false,
  },
  source_query_rejected: {
    title: 'Couldn’t load results',
    message: 'This data app’s query was rejected. Ask the app owner to fix it.',
    retryable: false,
  },
  source_rate_limited: {
    title: 'Data source is busy',
    message: 'The lakehouse is handling too many requests.',
    retryable: true,
  },
  timeout: {
    title: 'Request timed out',
    message: 'The lakehouse took too long to respond.',
    retryable: true,
  },
  source_unavailable: {
    title: 'Couldn’t load results',
    message: 'The lakehouse isn’t responding.',
    retryable: true,
  },
  invalid_input: {
    title: 'Check the selected inputs',
    message: 'Choose valid inputs and try again.',
    retryable: false,
  },
  query_failed: {
    title: 'Couldn’t load results',
    message: 'The data request failed.',
    retryable: true,
  },
  request_failed: {
    title: 'Couldn’t load results',
    message: 'The data request failed.',
    retryable: true,
  },
} as const;

/** Safe request feedback. Retryability follows the failure code, never message text. */
export type DataFailure = {
  code: keyof typeof failures;
  message: string;
  retryable: boolean;
  requestId?: string;
};

/** Normalize transport and unexpected failures for deliberately custom request UI. */
export function getDataFailure(cause: unknown): DataFailure {
  const error = cause instanceof DataAppError ? cause : undefined;
  const code =
    error && Object.hasOwn(failures, error.code)
      ? (error.code as keyof typeof failures)
      : 'request_failed';
  return {
    code,
    message: failures[code].message,
    retryable: failures[code].retryable,
    ...(error?.requestId ? { requestId: error.requestId } : {}),
  };
}

export function errorPresentation(cause: unknown) {
  const failure = getDataFailure(cause);
  return {
    title: failures[failure.code].title,
    description: failure.message,
    retryable: failure.retryable,
  };
}
