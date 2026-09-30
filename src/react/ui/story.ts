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

/** One to four findings with unique, nonempty IDs and registered evidence.
 * Receives the displayed result and its original input during refresh or failure. */
export type BoundStory<Data, Input> = (
  snapshot: DisplayedSnapshot<Data, Input>
) => readonly StoryFinding[];

/** Validate the authored findings before handing them to the presentation UI. */

export function storySteps(
  findings: readonly StoryFinding[],
  context: DataContext
): StoryStep[] {
  invariant(
    findings.length >= 1 && findings.length <= 4,
    'A story needs one to four findings.'
  );
  const ids = new Set<string>();
  const knownQueries =
    context.queryNames && new Set(Object.values(context.queryNames));

  return findings.map(finding => {
    invariant(
      !!finding.id.trim() && !ids.has(finding.id),
      `Story finding IDs must be nonempty and unique: ${finding.id}.`
    );
    invariant(
      !!finding.headline.trim(),
      `Story finding ${finding.id} needs a headline.`
    );
    ids.add(finding.id);
    const evidence =
      'evidence' in finding.evidence
        ? finding.evidence.evidence
        : finding.evidence;
    invariant(
      !!evidence.glossaryIds?.length || !!evidence.queryNames?.length,
      `Story finding ${finding.id} needs source evidence.`
    );
    for (const id of evidence.glossaryIds ?? [])
      invariant(context.glossary[id], `Unknown glossary entry: ${id}.`);
    for (const name of evidence.queryNames ?? [])
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
