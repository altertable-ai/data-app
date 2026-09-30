import { defineQueryNames } from '@/src/core/contract';
import { invariant } from '@/src/core/invariant';
import type { ReactNode } from 'react';
import type { DataIdentifierDefinition } from '@/src/react/ui/data-identifiers';
import type { MetricFormat } from '@/src/core/format';
import type { MetricDefinition } from '@/src/react/ui/metric';
import type { StoryFinding } from '@/src/react/ui/story';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';

export type GlossaryEntry = {
  term: string;
  definition: ReactNode;
  queryNames?: string[];
};

export type DataContext = {
  description: ReactNode;
  glossary: Record<string, GlossaryEntry>;
  identifiers?: Readonly<Record<string, DataIdentifierDefinition>>;
  queryNames?: Readonly<Record<string, string>>;
};

export function defineDataContext<const Context extends DataContext>(
  context: Context
): Context {
  return context;
}

export function evidenceFor<
  const Context extends DataContext,
  const Names extends Record<string, string> = Record<string, string>,
>(context: Context, names?: Names) {
  function validateEvidence(evidence: {
    id: string;
    glossaryIds?: readonly (keyof Context['glossary'] & string)[];
    queryNames?: readonly Names[keyof Names][];
  }) {
    for (const id of evidence.glossaryIds ?? []) {
      invariant(context.glossary[id], `Unknown glossary entry: ${id}.`);
    }
    if (names)
      for (const name of evidence.queryNames ?? []) {
        invariant(
          Object.values(names).includes(name),
          `Unknown query name: ${name}.`
        );
      }

    return {
      id: evidence.id,
      glossaryIds: evidence.glossaryIds ? [...evidence.glossaryIds] : undefined,
      queryNames: evidence.queryNames ? [...evidence.queryNames] : undefined,
    };
  }

  return validateEvidence;
}

/** Bind glossary query references and card evidence to the same registry. */
export function createDataContext<const Names extends Record<string, string>>(
  queryNames: Names
) {
  defineQueryNames(queryNames);

  function bindDataContext<
    const Context extends Omit<DataContext, 'glossary'> & {
      glossary: Record<
        string,
        Omit<GlossaryEntry, 'queryNames'> & {
          queryNames?: Names[keyof Names][];
        }
      >;
    },
  >(context: Context) {
    const known = new Set(Object.values(queryNames));
    for (const [id, entry] of Object.entries(context.glossary)) {
      for (const query of entry.queryNames ?? []) {
        invariant(
          known.has(query),
          `Unknown query ${query} for glossary entry ${id}.`
        );
      }
    }
    const references = evidenceFor(context, queryNames);
    type GlossaryId = keyof Context['glossary'] & string;
    type QueryName = Names[keyof Names];

    function evidence(
      input: { id: string } & (
        | {
            glossaryIds: readonly [GlossaryId, ...GlossaryId[]];
            queryNames?: readonly QueryName[];
          }
        | {
            queryNames: readonly [QueryName, ...QueryName[]];
            glossaryIds?: readonly GlossaryId[];
          }
      )
    ): WidgetEvidence {
      invariant(!!input.id.trim(), 'Evidence needs a nonempty ID.');
      invariant(
        !!input.glossaryIds?.length || !!input.queryNames?.length,
        `Evidence ${input.id} needs a glossary entry or query name.`
      );
      const validated = references(input);
      if (validated.glossaryIds?.length)
        return {
          ...validated,
          glossaryIds: [
            validated.glossaryIds[0]!,
            ...validated.glossaryIds.slice(1),
          ],
        };

      return {
        ...validated,
        queryNames: [
          validated.queryNames![0]!,
          ...validated.queryNames!.slice(1),
        ],
      };
    }

    function finding(
      input: Omit<StoryFinding, 'evidence'> & {
        evidence: Parameters<typeof evidence>[0];
      }
    ): StoryFinding & { evidence: WidgetEvidence } {
      return { ...input, evidence: evidence(input.evidence) };
    }

    function metric(definition: {
      id: string;
      glossaryId: keyof Context['glossary'] & string;
      label?: string;
      format: MetricFormat;
      favorableDirection?: 'up' | 'down';
      queryNames?: readonly Names[keyof Names][];
    }): MetricDefinition {
      const references = evidence({
        id: definition.id,
        glossaryIds: [definition.glossaryId],
        queryNames:
          definition.queryNames ??
          context.glossary[definition.glossaryId]?.queryNames,
      });

      return {
        id: definition.id,
        label:
          definition.label ?? context.glossary[definition.glossaryId]!.term,
        format: definition.format,
        favorableDirection: definition.favorableDirection,
        evidence: references,
      };
    }

    return { ...context, queryNames, evidence, finding, metric };
  }

  return bindDataContext;
}
