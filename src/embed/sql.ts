import type { Lakehouse } from '@/src/core/contract';
import { toDataOperationFailure } from '@/src/core/operation';
import {
  MessageRoutingError,
  type MessageContext,
  type SqlQueryInput,
} from '@/src/core/messages';

/** Authorize every SQL request and supply a backend that independently enforces access and query limits. */
export function createSqlQueryHandler(
  authorize: (
    query: SqlQueryInput,
    context: MessageContext
  ) => Promise<Lakehouse>
) {
  async function handleSqlQuery(input: SqlQueryInput, context: MessageContext) {
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
        ...(input.params === undefined ? {} : { params: input.params }),
        signal: context.signal,
      });
    } catch (error) {
      context.signal.throwIfAborted();
      if (error instanceof MessageRoutingError) throw error;
      const failure = toDataOperationFailure(error);
      throw new MessageRoutingError(failure.code, failure.message, requestId);
    }
  }

  return handleSqlQuery;
}
