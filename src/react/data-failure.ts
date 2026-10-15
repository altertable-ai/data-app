import { DataAppError } from '@/src/client/transport';

const failures = {
  source_unauthorized: {
    message: 'Connection unavailable. Ask the app owner to reconnect it.',
    retryable: false,
  },
  source_forbidden: {
    message: 'Data access denied. Ask the app owner for access.',
    retryable: false,
  },
  source_query_rejected: {
    message: 'Couldn’t load results. Ask the app owner to check the query.',
    retryable: false,
  },
  source_rate_limited: {
    message: 'Data source is busy. Try again shortly.',
    retryable: true,
  },
  timeout: {
    message: 'Request timed out.',
    retryable: true,
  },
  source_unavailable: {
    message: 'Couldn’t load results. Data source unavailable.',
    retryable: true,
  },
  invalid_input: {
    message: 'Check the selected inputs.',
    retryable: false,
  },
  query_failed: {
    message: 'Couldn’t load results.',
    retryable: true,
  },
  request_failed: {
    message: 'Couldn’t load results.',
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
