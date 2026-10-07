import type {
  DataWidgetProps,
  VisualizationWidgetProps,
  WidgetEvidence,
} from '@altertable/data-app/react';

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
  const visual: VisualizationWidgetProps<number> = {
    ...content,
    evidence,
    emptyFallback,
  };

  // @ts-expect-error A data reading requires evidence.
  const dataWithoutEvidence: DataWidgetProps<number> = {
    ...content,
    emptyFallback,
  };
  // @ts-expect-error A visual reading requires evidence.
  const visualWithoutEvidence: VisualizationWidgetProps<number> = {
    ...content,
    emptyFallback,
  };
  // @ts-expect-error A data reading requires an authored empty state.
  const dataWithoutEmpty: DataWidgetProps<number> = { ...content, evidence };
  // @ts-expect-error A visual reading requires an authored empty state.
  const visualWithoutEmpty: VisualizationWidgetProps<number> = {
    ...content,
    evidence,
  };
  // @ts-expect-error A renderer callback requires a bound reading.
  const unbound: DataWidgetProps<number> = {
    title: 'Activity',
    children: content.children,
  };

  return {
    data,
    visual,
    dataWithoutEvidence,
    visualWithoutEvidence,
    dataWithoutEmpty,
    visualWithoutEmpty,
    unbound,
  };
}

void verifyBoundWidgets;
