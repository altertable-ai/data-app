import type { CSSProperties } from 'react';

/** Public custom-property names for authoring types and validation. CSS owns their defaults. */
export const dataAppStyleTokens = [
  '--atbl-background',
  '--atbl-surface',
  '--atbl-subtle',
  '--atbl-text',
  '--atbl-muted',
  '--atbl-border',
  '--atbl-accent',
  '--atbl-accent-subtle',
  '--atbl-on-accent',
  '--atbl-positive',
  '--atbl-negative',
  '--atbl-danger',
  '--atbl-danger-subtle',
  '--atbl-backdrop',
  '--atbl-code-surface',
  '--atbl-code-text',
  '--atbl-code-keyword',
  '--atbl-chart-fill',
  '--atbl-control-hover-border',
  '--atbl-focus-color',
  '--atbl-focus-outline',
  '--atbl-focus-ring-offset',
  '--atbl-focus-ring-inset',
  '--atbl-font',
  '--atbl-font-heading',
  '--atbl-mono-font',
  '--atbl-space-xs',
  '--atbl-space-sm',
  '--atbl-space-md',
  '--atbl-space-lg',
  '--atbl-space-xl',
  '--atbl-layout-gap',
  '--atbl-content-width',
  '--atbl-control-height',
  '--atbl-radius-control',
  '--atbl-radius-surface',
  '--atbl-radius-overlay',
  '--atbl-shadow-surface',
  '--atbl-shadow-overlay',
  '--atbl-shadow-control',
  '--atbl-cursor-action',
  '--atbl-cursor-disabled',
  '--atbl-cursor-help',
  '--atbl-duration-fast',
  '--atbl-duration-normal',
  '--atbl-duration-slow',
  '--atbl-ease-standard',
  '--atbl-ease-enter',
  '--atbl-chart-1',
  '--atbl-chart-2',
  '--atbl-chart-3',
  '--atbl-chart-4',
  '--atbl-chart-5',
  '--atbl-chart-6',
  '--atbl-chart-7',
  '--atbl-chart-8',
  '--atbl-type-emphasis-weight',
  '--atbl-type-meta-weight',
  '--atbl-type-page-size',
  '--atbl-type-section-size',
  '--atbl-type-widget-size',
  '--atbl-type-body-size',
  '--atbl-type-label-size',
  '--atbl-type-meta-size',
  '--atbl-type-metric-size',
  '--atbl-type-heading-weight',
  '--atbl-type-label-weight',
  '--atbl-type-body-leading',
  '--atbl-type-label-leading',
  '--atbl-type-heading-leading',
  '--atbl-type-metric-leading',
  '--atbl-text-measure',
  '--atbl-control-compact-height',
  '--atbl-control-icon-size',
  '--atbl-control-padding-inline',
  '--atbl-control-padding-block',
  '--atbl-control-gap',
  '--atbl-control-disabled-opacity',
  '--atbl-cursor-busy',
  '--atbl-control-hover-surface',
  '--atbl-control-pressed-surface',
  '--atbl-control-selected-surface',
  '--atbl-control-selected-text',
] as const;

/** Stable component roots for CSS customization; only utilities may be placed on native markup. */
export const dataAppStyleClasses = {
  'altertable-app-layout': {
    component: 'AppLayout',
    kind: 'root',
  },
  'altertable-stack': {
    component: 'Stack',
    kind: 'root',
  },
  'altertable-grid': {
    component: 'Grid',
    kind: 'root',
  },
  'altertable-grid-item': {
    component: 'GridItem',
    kind: 'root',
  },
  'altertable-text-content': {
    component: 'TextContent',
    kind: 'root',
  },
  'altertable-button': {
    component: 'Button',
    kind: 'root',
  },
  'altertable-tabs': {
    component: 'Tabs',
    kind: 'root',
  },
  'altertable-data-widget': {
    component: 'DataWidget',
    kind: 'root',
  },
  'altertable-metric-widget': {
    component: 'MetricWidget',
    kind: 'root',
  },
  'altertable-data-app-skeleton': {
    component: 'DataAppSkeleton',
    kind: 'root',
  },
  'altertable-sr-only': {
    component: null,
    kind: 'utility',
  },
} as const;

export const dataAppStyleHooks = {
  'data-atbl-focus': ['ring', 'inset', 'group'],
  'data-atbl-control': ['action', 'help', 'text'],
} as const;

export type DataAppStyleToken = (typeof dataAppStyleTokens)[number];
/** React style properties with checked public Altertable custom properties. */
export type DataAppStyle = CSSProperties &
  Partial<Record<DataAppStyleToken, string | number>>;
export type DataAppStyleHooks = {
  [
    Name in keyof typeof dataAppStyleHooks
  ]?: (typeof dataAppStyleHooks)[Name][number];
};
