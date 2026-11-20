import type { WidgetEvidence } from '@altertable/data-app-react';
import type { DataWidgetProps } from '@altertable/data-app-react/ui';

// Compile-only assertions: readings always carry evidence and empty-result semantics.
function verifyBoundWidgets(evidence: WidgetEvidence) {
  const content = {
    title: 'Activity',
    reading: { loading: false as const, value: 0 },
    isEmpty: (value: number) => value === 0,
    children: (value: number) => String(value),
  };
  const emptyFallback = { title: 'No activity' };
  const data: DataWidgetProps<number> = { ...content, evidence, emptyFallback };

  // @ts-expect-error A data reading requires evidence.
  const dataWithoutEvidence: DataWidgetProps<number> = {
    ...content,
    emptyFallback,
  };
  // @ts-expect-error A data reading requires an authored empty state.
  const dataWithoutEmpty: DataWidgetProps<number> = { ...content, evidence };
  // @ts-expect-error A renderer callback requires a bound reading.
  const unbound: DataWidgetProps<number> = {
    title: 'Activity',
    children: content.children,
  };

  return {
    data,
    dataWithoutEvidence,
    dataWithoutEmpty,
    unbound,
  };
}

void verifyBoundWidgets;
