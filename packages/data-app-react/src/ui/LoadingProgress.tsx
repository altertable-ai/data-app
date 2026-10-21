import { createContext, useContext } from 'react';

import { useInspectionDefaults } from './InspectionContext.tsx';
import { ProgressPercentage } from './ProgressPercentage.tsx';
import type { WidgetEvidence } from './WidgetEvidence.ts';

export const QueryProgressContext = createContext<
  Readonly<Record<string, number>> | undefined
>(undefined);

export function LoadingProgress({
  progress,
  label,
}: {
  progress: number;
  label: string;
}) {
  return (
    <div className="altertable-loading-progress">
      <progress aria-label={label} max={100} value={progress} />
      <ProgressPercentage progress={progress} />
    </div>
  );
}

export function useWidgetProgress(evidence: WidgetEvidence | undefined) {
  const queries = useContext(QueryProgressContext);
  const dataContext = useInspectionDefaults()?.dataContext;
  if (!queries || !evidence) return undefined;
  const names = new Set(
    evidence.queryNames?.length
      ? evidence.queryNames
      : (evidence.glossaryIds ?? []).flatMap(
          id => dataContext?.glossary[id]?.queryNames ?? []
        )
  );
  if (![...names].some(name => name in queries)) return undefined;
  let total = 0;
  for (const name of names) total += queries[name] ?? 0;
  return total / names.size;
}
