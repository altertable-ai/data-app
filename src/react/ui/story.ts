import type { ReactNode } from 'react';
import type { DisplayedSnapshot } from '@/src/core/data-view';
import { invariant } from '@/src/core/invariant';
import type { MetricDefinition } from '@/src/react/ui/metric';
import type { StoryStep } from '@/src/react/ui/PresentStory';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';
import type { DataContext } from '@/src/react/ui/data-context';

/** One consequential, inspectable finding from the displayed result. */
export type StoryFinding = {
  id: string;
  headline: string;
  context?: string;
  visual: ReactNode;
  visualKind?: 'metric' | 'chart';
  evidence: WidgetEvidence | MetricDefinition;
};

/** Findings with unique, nonempty IDs and registered evidence; the first four are presented.
 * Receives the displayed result and its original input during refresh or failure. */
export type BoundStory<Data, Input> = (
  snapshot: DisplayedSnapshot<Data, Input>
) => readonly StoryFinding[];

/** Validate the authored findings before handing them to the presentation UI. */
export function storySteps(
  findings: readonly StoryFinding[],
  context: DataContext
): StoryStep[] {
  const ids = new Set<string>();
  const knownQueries =
    context.queryNames && new Set(Object.values(context.queryNames));

  return findings.slice(0, 4).map(finding => {
    // oxlint-disable-next-line data-app/no-runtime-assertion -- Unique finding IDs are an authoring contract.
    invariant(
      !!finding.id.trim() && !ids.has(finding.id),
      `Story finding IDs must be nonempty and unique: ${finding.id}.`
    );
    // oxlint-disable-next-line data-app/no-runtime-assertion -- Headlines are authored copy.
    invariant(
      !!finding.headline.trim(),
      `Story finding ${finding.id} needs a headline.`
    );
    ids.add(finding.id);
    const evidence =
      'evidence' in finding.evidence
        ? finding.evidence.evidence
        : finding.evidence;
    for (const id of evidence.glossaryIds ?? [])
      // oxlint-disable-next-line data-app/no-runtime-assertion -- Direct findings reference the context at runtime.
      invariant(context.glossary[id], `Unknown glossary entry: ${id}.`);
    for (const name of evidence.queryNames ?? [])
      // oxlint-disable-next-line data-app/no-runtime-assertion -- Direct findings reference the context at runtime.
      invariant(
        !knownQueries || knownQueries.has(name),
        `Unknown query name: ${name}.`
      );

    return {
      id: finding.id,
      headline: finding.headline,
      context: finding.context,
      visual: finding.visual,
      visualKind: finding.visualKind,
      glossaryIds: evidence.glossaryIds,
      queryNames: evidence.queryNames,
    };
  });
}
