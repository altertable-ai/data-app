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

export type MetricDeclaration = {
  id: string;
  glossaryId: string;
  label?: string;
  format: MetricFormat;
  favorableDirection?: 'up' | 'down';
  queryNames?: readonly string[];
};
export type EvidenceDeclaration = { id: string } & (
  | {
      glossaryIds: readonly [string, ...string[]];
      queryNames?: readonly string[];
    }
  | {
      queryNames: readonly [string, ...string[]];
      glossaryIds?: readonly string[];
    }
);
export type AuthoringDataContext = DataContext & {
  metric(definition: MetricDeclaration): MetricDefinition;
  evidence(definition: EvidenceDeclaration): WidgetEvidence;
};

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
      // oxlint-disable-next-line data-app/no-runtime-assertion -- Evidence IDs are an authoring contract.
      invariant(!!input.id.trim(), 'Evidence needs a nonempty ID.');
      const validated = {
        id: input.id,
        glossaryIds: input.glossaryIds && [...input.glossaryIds],
        queryNames: input.queryNames && [...input.queryNames],
      };
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
