import { DataSourceError, type Lakehouse } from '@/src/core/contract';
import { dataOperationFailure } from '@/src/core/operation';
import {
  MessageRoutingError,
  type MessageContext,
  type sqlQueryRoute,
} from '@/src/core/messages';

type SqlQueryInput = ReturnType<typeof sqlQueryRoute.input>;

/** Authorize every SQL request and supply a backend that independently enforces access and query limits. */
export function createSqlQueryHandler(
  authorize: (
    query: SqlQueryInput,
    context: MessageContext
  ) => Promise<Lakehouse>
) {
  async function query(input: SqlQueryInput, context: MessageContext) {
    const requestId = crypto.randomUUID();
    context.signal.throwIfAborted();
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
        signal: context.signal,
      });
    } catch (error) {
      context.signal.throwIfAborted();
      if (error instanceof MessageRoutingError) throw error;
      if (error instanceof DataSourceError) {
        const failure = dataOperationFailure(error);
        throw new MessageRoutingError(failure.code, failure.message, requestId);
      }
      throw new MessageRoutingError(
        'query_failed',
        'The data request failed.',
        requestId
      );
    }
  }

  return query;
}
