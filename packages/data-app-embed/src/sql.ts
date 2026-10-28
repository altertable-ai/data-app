import {
  type Lakehouse,
  MessageRoutingError,
  type MessageContext,
  type SqlQueryInput,
} from '@altertable/data-app/contract';
import {
  MAX_QUERY_ROWS,
  randomUuid,
  toDataOperationFailure,
} from '@altertable/data-app/internal';

/** Authorize every SQL request and supply a backend that independently enforces access and query limits. */
export function createSqlQueryHandler(
  authorize: (
    query: SqlQueryInput,
    context: MessageContext
  ) => Promise<Lakehouse>
) {
  async function handleSqlQuery(input: SqlQueryInput, context: MessageContext) {
    const requestId = randomUuid();
    context.signal.throwIfAborted();
    if (input.limit > MAX_QUERY_ROWS)
      throw new MessageRoutingError(
        'query_rejected',
        `SQL queries cannot request more than ${MAX_QUERY_ROWS.toLocaleString('en-US')} rows.`,
        requestId
      );
    let lakehouse: Lakehouse;
    try {
      lakehouse = await authorize(input, context);
    } catch {
      context.signal.throwIfAborted();
      throw new MessageRoutingError(
        'forbidden',
        'You cannot run this query.',
        requestId
      );
    }
    context.signal.throwIfAborted();
    try {
      return await lakehouse.queryAll(input.statement, {
        limit: input.limit,
        ...(input.params === undefined ? {} : { params: input.params }),
        signal: context.signal,
      });
    } catch (error) {
      context.signal.throwIfAborted();
      if (error instanceof MessageRoutingError) throw error;
      const failure = toDataOperationFailure(error);
      throw new MessageRoutingError(failure.code, failure.message, requestId, {
        cause: error,
      });
    }
  }

  return handleSqlQuery;
}
