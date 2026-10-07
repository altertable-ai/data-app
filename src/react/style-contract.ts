import type { CSSProperties } from 'react';

/** Public styling contract. Generate CSS and the reference with bun run generate:styles. */
export const dataAppStyleTokens = {
  '--atbl-background': {
    scope: 'inherited',
    default: 'var(--atbl-palette-background)',
    group: 'Surfaces',
    description: 'Document canvas.',
  },
  '--atbl-surface': {
    scope: 'inherited',
    default: 'var(--atbl-palette-surface)',
    group: 'Surfaces',
    description: 'Widget and overlay surface.',
  },
  '--atbl-subtle': {
    scope: 'inherited',
    default: 'var(--atbl-palette-subtle)',
    group: 'Surfaces',
    description: 'Quiet surface and hover fill.',
  },
  '--atbl-text': {
    scope: 'inherited',
    default: 'var(--atbl-palette-text)',
    group: 'Text and borders',
    description: 'Primary text.',
  },
  '--atbl-muted': {
    scope: 'inherited',
    default: 'var(--atbl-palette-muted)',
    group: 'Text and borders',
    description: 'Secondary text.',
  },
  '--atbl-border': {
    scope: 'inherited',
    default: 'var(--atbl-palette-border)',
    group: 'Text and borders',
    description: 'Decorative dividers and surface borders.',
  },
  '--atbl-accent': {
    scope: 'inherited',
    default: 'var(--atbl-input-accent, #405d47)',
    group: 'Accent and selection',
    description: 'Brand accent and selected controls.',
  },
  '--atbl-accent-hover': {
    scope: 'component',
    default:
      'color-mix(in srgb, var(--atbl-accent) 80%, var(--atbl-accent-hover-target))',
    group: 'Accent and selection',
    description: 'Hovered accent.',
  },
  '--atbl-accent-subtle': {
    scope: 'component',
    default:
      'color-mix( in srgb, var(--atbl-accent) var(--atbl-accent-subtle-strength), var(--atbl-surface) )',
    group: 'Accent and selection',
    description: 'Quiet selected surface.',
  },
  '--atbl-on-accent': {
    scope: 'inherited',
    default: 'var(--atbl-input-on-accent, #fff)',
    group: 'Accent and selection',
    description: 'Foreground on an accent-filled control.',
  },
  '--atbl-positive': {
    scope: 'component',
    default: 'var(--atbl-accent)',
    group: 'Meaning',
    description: 'Favorable metric change.',
  },
  '--atbl-negative': {
    scope: 'component',
    default: 'var(--atbl-danger)',
    group: 'Meaning',
    description: 'Unfavorable metric change.',
  },
  '--atbl-danger': {
    scope: 'inherited',
    default: '#b42318',
    group: 'Meaning',
    description: 'Error text and invalid controls.',
  },
  '--atbl-danger-subtle': {
    scope: 'inherited',
    default: 'color-mix( in srgb, var(--atbl-danger) 9%, var(--atbl-surface) )',
    group: 'Meaning',
    description: 'Quiet error surface.',
  },
  '--atbl-backdrop': {
    scope: 'inherited',
    default: 'rgb(15 23 30 / 22%)',
    group: 'Surfaces',
    description: 'Modal backdrop.',
  },
  '--atbl-code-surface': {
    scope: 'inherited',
    default: '#f4f6f9',
    group: 'Code',
    description: 'Code block surface.',
  },
  '--atbl-code-text': {
    scope: 'inherited',
    default: '#273242',
    group: 'Code',
    description: 'Code block text.',
  },
  '--atbl-code-keyword': {
    scope: 'component',
    default: 'var(--atbl-accent)',
    group: 'Code',
    description: 'SQL keywords.',
  },
  '--atbl-chart-fill': {
    scope: 'component',
    default:
      'color-mix( in srgb, var(--atbl-accent) 75%, var(--atbl-surface) )',
    group: 'Charts',
    description: 'Unselected bar fill.',
  },
  '--atbl-control-hover-border': {
    scope: 'component',
    default: 'color-mix( in srgb, var(--atbl-muted) 45%, var(--atbl-border) )',
    group: 'Text and borders',
    description: 'Hovered control border.',
  },
  '--atbl-focus-color': {
    scope: 'component',
    default: 'var(--atbl-muted)',
    group: 'Focus',
    description: 'Keyboard focus indicator color.',
  },
  '--atbl-focus-outline': {
    scope: 'component',
    default: '1px solid var(--atbl-focus-color)',
    group: 'Focus',
    description: 'Complete keyboard focus outline.',
  },
  '--atbl-focus-ring-offset': {
    scope: 'inherited',
    default: '2px',
    group: 'Focus',
    description: 'Outer outline offset.',
  },
  '--atbl-focus-ring-inset': {
    scope: 'inherited',
    default: '-1px',
    group: 'Focus',
    description: 'Inset outline offset.',
  },
  '--atbl-font': {
    scope: 'inherited',
    default:
      "var( --atbl-input-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ui-sans-serif, sans-serif )",
    group: 'Typography',
    description: 'Body font stack.',
  },
  '--atbl-font-heading': {
    scope: 'component',
    default: 'var(--atbl-input-font-heading, var(--atbl-font))',
    group: 'Typography',
    description: 'Heading and metric font stack.',
  },
  '--atbl-mono-font': {
    scope: 'inherited',
    default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    group: 'Code',
    description: 'Code font stack.',
  },
  '--atbl-space-xs': {
    scope: 'inherited',
    default: '5px',
    group: 'Layout',
    description: 'Spacing step xs.',
  },
  '--atbl-space-sm': {
    scope: 'inherited',
    default: '10px',
    group: 'Layout',
    description: 'Spacing step sm.',
  },
  '--atbl-space-md': {
    scope: 'inherited',
    default: '16px',
    group: 'Layout',
    description: 'Spacing step md.',
  },
  '--atbl-space-lg': {
    scope: 'inherited',
    default: '24px',
    group: 'Layout',
    description: 'Spacing step lg.',
  },
  '--atbl-space-xl': {
    scope: 'inherited',
    default: '32px',
    group: 'Layout',
    description: 'Spacing step xl.',
  },
  '--atbl-layout-gap': {
    scope: 'component',
    default: 'clamp(var(--atbl-space-md), 2.5vw, var(--atbl-space-lg))',
    group: 'Layout',
    description: 'Section and widget spacing.',
  },
  '--atbl-content-width': {
    scope: 'inherited',
    default: '960px',
    group: 'Layout',
    description: 'Maximum app content width.',
  },
  '--atbl-control-height': {
    scope: 'inherited',
    default: '2.375rem',
    group: 'Layout',
    description: 'Default button minimum height.',
  },
  '--atbl-radius-control': {
    scope: 'inherited',
    default: '7px',
    group: 'Shape',
    description: 'Control corner radius.',
  },
  '--atbl-radius-surface': {
    scope: 'inherited',
    default: '12px',
    group: 'Shape',
    description: 'Surface corner radius.',
  },
  '--atbl-radius-overlay': {
    scope: 'inherited',
    default: '16px',
    group: 'Shape',
    description: 'Overlay corner radius.',
  },
  '--atbl-shadow-surface': {
    scope: 'inherited',
    default: '0 3px 16px rgb(20 28 40 / 5%)',
    group: 'Elevation',
    description: 'Surface elevation.',
  },
  '--atbl-shadow-overlay': {
    scope: 'inherited',
    default: '0 18px 50px rgb(0 0 0 / 16%)',
    group: 'Elevation',
    description: 'Overlay elevation.',
  },
  '--atbl-shadow-control': {
    scope: 'inherited',
    default: '0 1px 3px rgb(0 0 0 / 10%)',
    group: 'Elevation',
    description: 'Control elevation.',
  },
  '--atbl-cursor-action': {
    scope: 'inherited',
    default: 'pointer',
    group: 'Cursors',
    description: 'Enabled interactive controls.',
  },
  '--atbl-cursor-disabled': {
    scope: 'inherited',
    default: 'default',
    group: 'Cursors',
    description: 'Disabled controls.',
  },
  '--atbl-cursor-help': {
    scope: 'inherited',
    default: 'help',
    group: 'Cursors',
    description: 'Definition and timestamp details.',
  },
  '--atbl-duration-fast': {
    scope: 'inherited',
    default: '120ms',
    group: 'Motion',
    description: 'Fast interaction duration.',
  },
  '--atbl-duration-normal': {
    scope: 'inherited',
    default: '180ms',
    group: 'Motion',
    description: 'Normal interaction duration.',
  },
  '--atbl-duration-slow': {
    scope: 'inherited',
    default: '240ms',
    group: 'Motion',
    description: 'Slow interaction duration.',
  },
  '--atbl-ease-standard': {
    scope: 'inherited',
    default: 'ease',
    group: 'Motion',
    description: 'Standard transition easing.',
  },
  '--atbl-ease-enter': {
    scope: 'inherited',
    default: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    group: 'Motion',
    description: 'Overlay entrance easing.',
  },
  '--atbl-chart-1': {
    scope: 'inherited',
    default:
      'color-mix( in srgb, var(--atbl-input-chart-1, #285fc0) var(--atbl-chart-strength), white )',
    group: 'Charts',
    description: 'Categorical chart color 1.',
  },
  '--atbl-chart-2': {
    scope: 'inherited',
    default:
      'color-mix( in srgb, var(--atbl-input-chart-2, #a95319) var(--atbl-chart-strength), white )',
    group: 'Charts',
    description: 'Categorical chart color 2.',
  },
  '--atbl-chart-3': {
    scope: 'inherited',
    default:
      'color-mix( in srgb, var(--atbl-input-chart-3, #147862) var(--atbl-chart-strength), white )',
    group: 'Charts',
    description: 'Categorical chart color 3.',
  },
  '--atbl-chart-4': {
    scope: 'inherited',
    default:
      'color-mix( in srgb, var(--atbl-input-chart-4, #7243aa) var(--atbl-chart-strength), white )',
    group: 'Charts',
    description: 'Categorical chart color 4.',
  },
  '--atbl-chart-5': {
    scope: 'inherited',
    default:
      'color-mix( in srgb, var(--atbl-input-chart-5, #aa3958) var(--atbl-chart-strength), white )',
    group: 'Charts',
    description: 'Categorical chart color 5.',
  },
  '--atbl-chart-6': {
    scope: 'inherited',
    default:
      'color-mix( in srgb, var(--atbl-input-chart-6, #475569) var(--atbl-chart-strength), white )',
    group: 'Charts',
    description: 'Categorical chart color 6.',
  },
  '--atbl-chart-7': {
    scope: 'inherited',
    default:
      'color-mix( in srgb, var(--atbl-input-chart-7, #285fc0) var(--atbl-chart-strength), white )',
    group: 'Charts',
    description: 'Categorical chart color 7.',
  },
  '--atbl-chart-8': {
    scope: 'inherited',
    default:
      'color-mix( in srgb, var(--atbl-input-chart-8, #a95319) var(--atbl-chart-strength), white )',
    group: 'Charts',
    description: 'Categorical chart color 8.',
  },
  '--atbl-type-emphasis-weight': {
    scope: 'inherited',
    default: '680',
    group: 'Typography',
    description: 'Primary title and value emphasis weight.',
  },
  '--atbl-type-meta-weight': {
    scope: 'inherited',
    default: '500',
    group: 'Typography',
    description: 'Supporting metadata weight.',
  },
  '--atbl-type-page-size': {
    scope: 'inherited',
    default: 'clamp(1.375rem, 2.4vw, 1.75rem)',
    group: 'Typography',
    description: 'Page title size.',
  },
  '--atbl-type-section-size': {
    scope: 'inherited',
    default: '1.25rem',
    group: 'Typography',
    description: 'Section heading size.',
  },
  '--atbl-type-widget-size': {
    scope: 'inherited',
    default: '1.0625rem',
    group: 'Typography',
    description: 'Widget heading size.',
  },
  '--atbl-type-body-size': {
    scope: 'inherited',
    default: '.875rem',
    group: 'Typography',
    description: 'Narrative body text size.',
  },
  '--atbl-type-label-size': {
    scope: 'inherited',
    default: '.8125rem',
    group: 'Typography',
    description: 'Control and metric label size.',
  },
  '--atbl-type-meta-size': {
    scope: 'inherited',
    default: '.75rem',
    group: 'Typography',
    description: 'Supporting metadata size.',
  },
  '--atbl-type-metric-size': {
    scope: 'inherited',
    default: 'clamp(1.625rem, 3vw, 2.125rem)',
    group: 'Typography',
    description: 'Prominent metric value size.',
  },
  '--atbl-type-heading-weight': {
    scope: 'inherited',
    default: '650',
    group: 'Typography',
    description: 'Section and widget heading weight.',
  },
  '--atbl-type-label-weight': {
    scope: 'inherited',
    default: '600',
    group: 'Typography',
    description: 'Control label weight.',
  },
  '--atbl-type-body-leading': {
    scope: 'inherited',
    default: '1.65',
    group: 'Typography',
    description: 'Narrative line height.',
  },
  '--atbl-type-label-leading': {
    scope: 'inherited',
    default: '1.4',
    group: 'Typography',
    description: 'Control and metadata line height.',
  },
  '--atbl-type-heading-leading': {
    scope: 'inherited',
    default: '1.3',
    group: 'Typography',
    description: 'Section and widget heading line height.',
  },
  '--atbl-type-metric-leading': {
    scope: 'inherited',
    default: '1.08',
    group: 'Typography',
    description: 'Metric value line height.',
  },
  '--atbl-text-measure': {
    scope: 'inherited',
    default: '70ch',
    group: 'Typography',
    description: 'Maximum readable prose width.',
  },
  '--atbl-control-compact-height': {
    scope: 'inherited',
    default: '1.875rem',
    group: 'Controls',
    description: 'Explicit compact control minimum height.',
  },
  '--atbl-control-icon-size': {
    scope: 'inherited',
    default: '1rem',
    group: 'Controls',
    description: 'Default action icon size.',
  },
  '--atbl-control-padding-inline': {
    scope: 'inherited',
    default: '.75rem',
    group: 'Controls',
    description: 'Control horizontal padding.',
  },
  '--atbl-control-padding-block': {
    scope: 'inherited',
    default: '.375rem',
    group: 'Controls',
    description: 'Control vertical padding.',
  },
  '--atbl-control-gap': {
    scope: 'inherited',
    default: '.5rem',
    group: 'Controls',
    description: 'Control label and icon spacing.',
  },
  '--atbl-control-disabled-opacity': {
    scope: 'inherited',
    default: '.5',
    group: 'Controls',
    description: 'Disabled control opacity.',
  },
  '--atbl-cursor-busy': {
    scope: 'inherited',
    default: 'progress',
    group: 'Cursors',
    description: 'Ongoing action cursor; independent from disabled state.',
  },
  '--atbl-control-hover-surface': {
    scope: 'component',
    default: 'var(--atbl-subtle)',
    group: 'States',
    description: 'Enabled control hover fill.',
  },
  '--atbl-control-pressed-surface': {
    scope: 'component',
    default: 'color-mix(in srgb, var(--atbl-text) 8%, var(--atbl-surface))',
    group: 'States',
    description: 'Pressed control fill.',
  },
  '--atbl-control-selected-surface': {
    scope: 'component',
    default: 'var(--atbl-accent-subtle)',
    group: 'States',
    description: 'Selected option or toggled control fill.',
  },
  '--atbl-control-selected-text': {
    scope: 'component',
    default: 'var(--atbl-accent)',
    group: 'States',
    description: 'Selected option or toggled control foreground.',
  },
} as const;

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

export type DataAppStyleToken = keyof typeof dataAppStyleTokens;
/** React style properties with checked public Altertable custom properties. */
export type DataAppStyle = CSSProperties &
  Partial<Record<DataAppStyleToken, string | number>>;
export type DataAppStyleHooks = {
  [
    Name in keyof typeof dataAppStyleHooks
  ]?: (typeof dataAppStyleHooks)[Name][number];
};
