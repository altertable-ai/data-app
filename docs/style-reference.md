# Styling reference

Generated from the package styling contract. Use components and typed props first;
these tokens and root selectors are supported customization hooks.

See [Styling](styling.md) for composition and ownership, and the
[machine-readable contract](style-contract.json) for tooling.

## Public tokens

### Surfaces

| Token               | Purpose                       | Default                          |
| ------------------- | ----------------------------- | -------------------------------- |
| `--atbl-background` | Document canvas.              | `var(--atbl-palette-background)` |
| `--atbl-surface`    | Widget and overlay surface.   | `var(--atbl-palette-surface)`    |
| `--atbl-subtle`     | Quiet surface and hover fill. | `var(--atbl-palette-subtle)`     |
| `--atbl-backdrop`   | Modal backdrop.               | `rgb(15 23 30 / 22%)`            |

### Text and borders

| Token                         | Purpose                                  | Default                                                           |
| ----------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `--atbl-text`                 | Primary text.                            | `var(--atbl-palette-text)`                                        |
| `--atbl-muted`                | Secondary text.                          | `var(--atbl-palette-muted)`                                       |
| `--atbl-border`               | Decorative dividers and surface borders. | `var(--atbl-palette-border)`                                      |
| `--atbl-control-hover-border` | Hovered control border.                  | `color-mix( in srgb, var(--atbl-muted) 45%, var(--atbl-border) )` |

### Accent and selection

| Token                  | Purpose                                 | Default                                                             |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `--atbl-accent`        | Brand accent and selected controls.     | `var(--atbl-input-accent, #405d47)`                                 |
| `--atbl-accent-hover`  | Hovered accent.                         | `color-mix(in srgb, var(--atbl-accent) 80%, black)`                 |
| `--atbl-accent-subtle` | Quiet selected surface.                 | `color-mix( in srgb, var(--atbl-accent) 12%, var(--atbl-surface) )` |
| `--atbl-on-accent`     | Foreground on an accent-filled control. | `var(--atbl-input-on-accent, #fff)`                                 |

### Meaning

| Token                  | Purpose                          | Default                                                            |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `--atbl-positive`      | Favorable metric change.         | `var(--atbl-accent)`                                               |
| `--atbl-negative`      | Unfavorable metric change.       | `var(--atbl-danger)`                                               |
| `--atbl-danger`        | Error text and invalid controls. | `#b42318`                                                          |
| `--atbl-danger-subtle` | Quiet error surface.             | `color-mix( in srgb, var(--atbl-danger) 9%, var(--atbl-surface) )` |

### Code

| Token                 | Purpose             | Default                                                    |
| --------------------- | ------------------- | ---------------------------------------------------------- |
| `--atbl-code-surface` | Code block surface. | `#f4f6f9`                                                  |
| `--atbl-code-text`    | Code block text.    | `#273242`                                                  |
| `--atbl-code-keyword` | SQL keywords.       | `var(--atbl-accent)`                                       |
| `--atbl-mono-font`    | Code font stack.    | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

### Charts

| Token               | Purpose                    | Default                                                                                      |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `--atbl-chart-fill` | Unselected bar fill.       | `color-mix( in srgb, var(--atbl-accent) 75%, var(--atbl-surface) )`                          |
| `--atbl-chart-1`    | Categorical chart color 1. | `color-mix( in srgb, var(--atbl-input-chart-1, #285fc0) var(--atbl-chart-strength), white )` |
| `--atbl-chart-2`    | Categorical chart color 2. | `color-mix( in srgb, var(--atbl-input-chart-2, #a95319) var(--atbl-chart-strength), white )` |
| `--atbl-chart-3`    | Categorical chart color 3. | `color-mix( in srgb, var(--atbl-input-chart-3, #147862) var(--atbl-chart-strength), white )` |
| `--atbl-chart-4`    | Categorical chart color 4. | `color-mix( in srgb, var(--atbl-input-chart-4, #7243aa) var(--atbl-chart-strength), white )` |
| `--atbl-chart-5`    | Categorical chart color 5. | `color-mix( in srgb, var(--atbl-input-chart-5, #aa3958) var(--atbl-chart-strength), white )` |
| `--atbl-chart-6`    | Categorical chart color 6. | `color-mix( in srgb, var(--atbl-input-chart-6, #475569) var(--atbl-chart-strength), white )` |
| `--atbl-chart-7`    | Categorical chart color 7. | `color-mix( in srgb, var(--atbl-input-chart-7, #285fc0) var(--atbl-chart-strength), white )` |
| `--atbl-chart-8`    | Categorical chart color 8. | `color-mix( in srgb, var(--atbl-input-chart-8, #a95319) var(--atbl-chart-strength), white )` |

### Focus

| Token                      | Purpose                          | Default                             |
| -------------------------- | -------------------------------- | ----------------------------------- |
| `--atbl-focus-color`       | Keyboard focus indicator color.  | `var(--atbl-muted)`                 |
| `--atbl-focus-outline`     | Complete keyboard focus outline. | `1px solid var(--atbl-focus-color)` |
| `--atbl-focus-ring-offset` | Outer outline offset.            | `2px`                               |
| `--atbl-focus-ring-inset`  | Inset outline offset.            | `-1px`                              |

### Typography

| Token                 | Purpose                        | Default                                                                                                      |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `--atbl-font`         | Body font stack.               | `var( --atbl-input-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ui-sans-serif, sans-serif )` |
| `--atbl-font-heading` | Heading and metric font stack. | `var(--atbl-input-font-heading, var(--atbl-font))`                                                           |

### Layout

| Token                   | Purpose                        | Default                                                    |
| ----------------------- | ------------------------------ | ---------------------------------------------------------- |
| `--atbl-space-xs`       | Spacing step xs.               | `5px`                                                      |
| `--atbl-space-sm`       | Spacing step sm.               | `10px`                                                     |
| `--atbl-space-md`       | Spacing step md.               | `16px`                                                     |
| `--atbl-space-lg`       | Spacing step lg.               | `24px`                                                     |
| `--atbl-space-xl`       | Spacing step xl.               | `32px`                                                     |
| `--atbl-layout-gap`     | Section and widget spacing.    | `clamp(var(--atbl-space-md), 2.5vw, var(--atbl-space-lg))` |
| `--atbl-content-width`  | Maximum app content width.     | `960px`                                                    |
| `--atbl-control-height` | Default button minimum height. | `38px`                                                     |

### Shape

| Token                   | Purpose                | Default |
| ----------------------- | ---------------------- | ------- |
| `--atbl-radius-control` | Control corner radius. | `7px`   |
| `--atbl-radius-surface` | Surface corner radius. | `12px`  |
| `--atbl-radius-overlay` | Overlay corner radius. | `16px`  |

### Elevation

| Token                   | Purpose            | Default                         |
| ----------------------- | ------------------ | ------------------------------- |
| `--atbl-shadow-surface` | Surface elevation. | `0 3px 16px rgb(20 28 40 / 5%)` |
| `--atbl-shadow-overlay` | Overlay elevation. | `0 18px 50px rgb(0 0 0 / 16%)`  |
| `--atbl-shadow-control` | Control elevation. | `0 1px 3px rgb(0 0 0 / 10%)`    |

### Cursors

| Token                    | Purpose                           | Default   |
| ------------------------ | --------------------------------- | --------- |
| `--atbl-cursor-action`   | Enabled interactive controls.     | `pointer` |
| `--atbl-cursor-disabled` | Disabled controls.                | `default` |
| `--atbl-cursor-help`     | Definition and timestamp details. | `help`    |

### Motion

| Token                    | Purpose                      | Default                          |
| ------------------------ | ---------------------------- | -------------------------------- |
| `--atbl-duration-fast`   | Fast interaction duration.   | `120ms`                          |
| `--atbl-duration-normal` | Normal interaction duration. | `180ms`                          |
| `--atbl-duration-slow`   | Slow interaction duration.   | `240ms`                          |
| `--atbl-ease-standard`   | Standard transition easing.  | `ease`                           |
| `--atbl-ease-enter`      | Overlay entrance easing.     | `cubic-bezier(0.2, 0.7, 0.2, 1)` |

## Stable classes

Component roots may be selected in CSS; render their components rather than
copying root classes onto native markup. Add app-owned classes through `className`
for local customization. Descendant classes are internal.

| Class                          | Owner               | Use                             |
| ------------------------------ | ------------------- | ------------------------------- |
| `altertable-app-layout`        | `<AppLayout>`       | Root CSS customization          |
| `altertable-stack`             | `<Stack>`           | Root CSS customization          |
| `altertable-grid`              | `<Grid>`            | Root CSS customization          |
| `altertable-grid-item`         | `<GridItem>`        | Root CSS customization          |
| `altertable-text-content`      | `<TextContent>`     | Root CSS customization          |
| `altertable-button`            | `<Button>`          | Root CSS customization          |
| `altertable-tabs`              | `<Tabs>`            | Root CSS customization          |
| `altertable-data-widget`       | `<DataWidget>`      | Root CSS customization          |
| `altertable-metric-widget`     | `<MetricWidget>`    | Root CSS customization          |
| `altertable-data-app-skeleton` | `<DataAppSkeleton>` | Root CSS customization          |
| `altertable-sr-only`           | Native markup       | Visually hidden accessible text |

## Native control hooks

Package components set these automatically. Use them for custom native controls
only when a package component does not fit. Native semantics and accessibility
remain the control author's responsibility.

| Attribute           | Values                   |
| ------------------- | ------------------------ |
| `data-atbl-focus`   | `ring`, `inset`, `group` |
| `data-atbl-control` | `action`, `help`, `text` |
