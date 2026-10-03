import type { DataAppRegistration } from '@/src/core/query-registration';
import type { RegisteredQueryInput } from '@/src/core/messages';
import {
  defineQueryVariables,
  bindQueryVariables,
} from '@/src/core/query-variables';
import {
  queryVariableNames,
  buildQueryStatement,
} from '@/src/core/query-template';
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

/** Bind registration to the trusted app revision before constructing this handler. */
export function createRegisteredQueryHandler(
  registration: DataAppRegistration,
  authorize: (
    query: RegisteredQueryInput,
    context: MessageContext
  ) => Promise<Lakehouse>
) {
  defineQueryVariables(registration.variables);
  for (const statement of Object.values(registration.queries))
    queryVariableNames(statement, registration.variables);
  return async (input: RegisteredQueryInput, context: MessageContext) => {
    context.signal.throwIfAborted();
    const requestId = crypto.randomUUID();
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
    if (!Object.hasOwn(registration.queries, input.operation))
      throw new MessageRoutingError('not_found', 'Unknown query.');
    const statement = registration.queries[input.operation]!;
    const names = queryVariableNames(statement, registration.variables);
    const definitions = Object.fromEntries(
      names.map(name => [name, registration.variables[name]!])
    );
    let bindings;
    try {
      bindings = bindQueryVariables(definitions, input.variables);
    } catch {
      throw new MessageRoutingError(
        'invalid_input',
        'Invalid query variables.'
      );
    }
    context.signal.throwIfAborted();
    return createSqlQueryHandler(async () => lakehouse)(
      {
        statement: buildQueryStatement(statement, bindings),
        limit: input.limit,
      },
      context
    );
  };
}
