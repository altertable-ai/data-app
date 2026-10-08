import type { Lakehouse } from '@/src/core/contract';
import { toDataOperationFailure } from '@/src/core/operation';
import {
  MessageRoutingError,
  type MessageContext,
  type RegisteredQueryInput,
} from '@/src/core/messages';

/** Authorize every registered query and supply a backend that resolves the trusted statement and enforces access and query limits. */
export function createRegisteredQueryHandler(
  authorize: (
    query: RegisteredQueryInput,
    context: MessageContext
  ) => Promise<Lakehouse>
) {
  async function handleRegisteredQuery(
    input: RegisteredQueryInput,
    context: MessageContext
  ) {
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
      return await lakehouse.queryById(input.operation, input.variables, {
        limit: input.limit,
        signal: context.signal,
      });
    } catch (error) {
      context.signal.throwIfAborted();
      if (error instanceof MessageRoutingError) throw error;
      const failure = toDataOperationFailure(error);
      throw new MessageRoutingError(failure.code, failure.message, requestId);
    }
  }

  return handleRegisteredQuery;
}
