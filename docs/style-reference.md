# Styling reference

Generated from the package styling contract. Use components and typed props first;
these tokens and root selectors are supported customization hooks.

Computed component tokens are override points; their defaults resolve in package
styles where they are consumed. Inherited tokens are available to app-owned CSS.

See [Styling](styling.md) for composition and ownership, and the
[machine-readable contract](style-contract.json) for tooling.

## Public tokens

### Surfaces

| Token               | Scope                 | Purpose                       | Default                          |
| ------------------- | --------------------- | ----------------------------- | -------------------------------- |
| `--atbl-background` | Inherited theme value | Document canvas.              | `var(--atbl-palette-background)` |
| `--atbl-surface`    | Inherited theme value | Widget and overlay surface.   | `var(--atbl-palette-surface)`    |
| `--atbl-subtle`     | Inherited theme value | Quiet surface and hover fill. | `var(--atbl-palette-subtle)`     |
| `--atbl-backdrop`   | Inherited theme value | Modal backdrop.               | `rgb(15 23 30 / 22%)`            |

### Text and borders

| Token                         | Scope                      | Purpose                                  | Default                                                           |
| ----------------------------- | -------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `--atbl-text`                 | Inherited theme value      | Primary text.                            | `var(--atbl-palette-text)`                                        |
| `--atbl-muted`                | Inherited theme value      | Secondary text.                          | `var(--atbl-palette-muted)`                                       |
| `--atbl-border`               | Inherited theme value      | Decorative dividers and surface borders. | `var(--atbl-palette-border)`                                      |
| `--atbl-control-hover-border` | Computed component default | Hovered control border.                  | `color-mix( in srgb, var(--atbl-muted) 45%, var(--atbl-border) )` |

### Accent and selection

| Token                  | Scope                      | Purpose                                 | Default                                                                                            |
| ---------------------- | -------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `--atbl-accent`        | Inherited theme value      | Brand accent and selected controls.     | `var(--atbl-input-accent, #405d47)`                                                                |
| `--atbl-accent-hover`  | Computed component default | Hovered accent.                         | `color-mix(in srgb, var(--atbl-accent) 80%, var(--atbl-accent-hover-target))`                      |
| `--atbl-accent-subtle` | Computed component default | Quiet selected surface.                 | `color-mix( in srgb, var(--atbl-accent) var(--atbl-accent-subtle-strength), var(--atbl-surface) )` |
| `--atbl-on-accent`     | Inherited theme value      | Foreground on an accent-filled control. | `var(--atbl-input-on-accent, #fff)`                                                                |

### Meaning

| Token                  | Scope                      | Purpose                          | Default                                                            |
| ---------------------- | -------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `--atbl-positive`      | Computed component default | Favorable metric change.         | `var(--atbl-accent)`                                               |
| `--atbl-negative`      | Computed component default | Unfavorable metric change.       | `var(--atbl-danger)`                                               |
| `--atbl-danger`        | Inherited theme value      | Error text and invalid controls. | `#b42318`                                                          |
| `--atbl-danger-subtle` | Inherited theme value      | Quiet error surface.             | `color-mix( in srgb, var(--atbl-danger) 9%, var(--atbl-surface) )` |

### Code

| Token                 | Scope                      | Purpose             | Default                                                    |
| --------------------- | -------------------------- | ------------------- | ---------------------------------------------------------- |
| `--atbl-code-surface` | Inherited theme value      | Code block surface. | `#f4f6f9`                                                  |
| `--atbl-code-text`    | Inherited theme value      | Code block text.    | `#273242`                                                  |
| `--atbl-code-keyword` | Computed component default | SQL keywords.       | `var(--atbl-accent)`                                       |
| `--atbl-mono-font`    | Inherited theme value      | Code font stack.    | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

### Charts

| Token               | Scope                      | Purpose                    | Default                                                                                      |
| ------------------- | -------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `--atbl-chart-fill` | Computed component default | Unselected bar fill.       | `color-mix( in srgb, var(--atbl-accent) 75%, var(--atbl-surface) )`                          |
| `--atbl-chart-1`    | Inherited theme value      | Categorical chart color 1. | `color-mix( in srgb, var(--atbl-input-chart-1, #285fc0) var(--atbl-chart-strength), white )` |
| `--atbl-chart-2`    | Inherited theme value      | Categorical chart color 2. | `color-mix( in srgb, var(--atbl-input-chart-2, #a95319) var(--atbl-chart-strength), white )` |
| `--atbl-chart-3`    | Inherited theme value      | Categorical chart color 3. | `color-mix( in srgb, var(--atbl-input-chart-3, #147862) var(--atbl-chart-strength), white )` |
| `--atbl-chart-4`    | Inherited theme value      | Categorical chart color 4. | `color-mix( in srgb, var(--atbl-input-chart-4, #7243aa) var(--atbl-chart-strength), white )` |
| `--atbl-chart-5`    | Inherited theme value      | Categorical chart color 5. | `color-mix( in srgb, var(--atbl-input-chart-5, #aa3958) var(--atbl-chart-strength), white )` |
| `--atbl-chart-6`    | Inherited theme value      | Categorical chart color 6. | `color-mix( in srgb, var(--atbl-input-chart-6, #475569) var(--atbl-chart-strength), white )` |
| `--atbl-chart-7`    | Inherited theme value      | Categorical chart color 7. | `color-mix( in srgb, var(--atbl-input-chart-7, #285fc0) var(--atbl-chart-strength), white )` |
| `--atbl-chart-8`    | Inherited theme value      | Categorical chart color 8. | `color-mix( in srgb, var(--atbl-input-chart-8, #a95319) var(--atbl-chart-strength), white )` |

### Focus

| Token                      | Scope                      | Purpose                          | Default                             |
| -------------------------- | -------------------------- | -------------------------------- | ----------------------------------- |
| `--atbl-focus-color`       | Computed component default | Keyboard focus indicator color.  | `var(--atbl-muted)`                 |
| `--atbl-focus-outline`     | Computed component default | Complete keyboard focus outline. | `1px solid var(--atbl-focus-color)` |
| `--atbl-focus-ring-offset` | Inherited theme value      | Outer outline offset.            | `2px`                               |
| `--atbl-focus-ring-inset`  | Inherited theme value      | Inset outline offset.            | `-1px`                              |

### Typography

| Token                         | Scope                      | Purpose                                  | Default                                                                                                      |
| ----------------------------- | -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `--atbl-font`                 | Inherited theme value      | Body font stack.                         | `var( --atbl-input-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ui-sans-serif, sans-serif )` |
| `--atbl-font-heading`         | Computed component default | Heading and metric font stack.           | `var(--atbl-input-font-heading, var(--atbl-font))`                                                           |
| `--atbl-type-emphasis-weight` | Inherited theme value      | Primary title and value emphasis weight. | `680`                                                                                                        |
| `--atbl-type-meta-weight`     | Inherited theme value      | Supporting metadata weight.              | `500`                                                                                                        |
| `--atbl-type-page-size`       | Inherited theme value      | Page title size.                         | `clamp(1.375rem, 2.4vw, 1.75rem)`                                                                            |
| `--atbl-type-section-size`    | Inherited theme value      | Section heading size.                    | `1.25rem`                                                                                                    |
| `--atbl-type-widget-size`     | Inherited theme value      | Widget heading size.                     | `1.0625rem`                                                                                                  |
| `--atbl-type-body-size`       | Inherited theme value      | Narrative body text size.                | `.875rem`                                                                                                    |
| `--atbl-type-label-size`      | Inherited theme value      | Control and metric label size.           | `.8125rem`                                                                                                   |
| `--atbl-type-meta-size`       | Inherited theme value      | Supporting metadata size.                | `.75rem`                                                                                                     |
| `--atbl-type-metric-size`     | Inherited theme value      | Prominent metric value size.             | `clamp(1.625rem, 3vw, 2.125rem)`                                                                             |
| `--atbl-type-heading-weight`  | Inherited theme value      | Section and widget heading weight.       | `650`                                                                                                        |
| `--atbl-type-label-weight`    | Inherited theme value      | Control label weight.                    | `600`                                                                                                        |
| `--atbl-type-body-leading`    | Inherited theme value      | Narrative line height.                   | `1.65`                                                                                                       |
| `--atbl-type-label-leading`   | Inherited theme value      | Control and metadata line height.        | `1.4`                                                                                                        |
| `--atbl-type-heading-leading` | Inherited theme value      | Section and widget heading line height.  | `1.3`                                                                                                        |
| `--atbl-type-metric-leading`  | Inherited theme value      | Metric value line height.                | `1.08`                                                                                                       |
| `--atbl-text-measure`         | Inherited theme value      | Maximum readable prose width.            | `70ch`                                                                                                       |

### Layout

| Token                   | Scope                      | Purpose                        | Default                                                    |
| ----------------------- | -------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `--atbl-space-xs`       | Inherited theme value      | Spacing step xs.               | `5px`                                                      |
| `--atbl-space-sm`       | Inherited theme value      | Spacing step sm.               | `10px`                                                     |
| `--atbl-space-md`       | Inherited theme value      | Spacing step md.               | `16px`                                                     |
| `--atbl-space-lg`       | Inherited theme value      | Spacing step lg.               | `24px`                                                     |
| `--atbl-space-xl`       | Inherited theme value      | Spacing step xl.               | `32px`                                                     |
| `--atbl-layout-gap`     | Computed component default | Section and widget spacing.    | `clamp(var(--atbl-space-md), 2.5vw, var(--atbl-space-lg))` |
| `--atbl-content-width`  | Inherited theme value      | Maximum app content width.     | `960px`                                                    |
| `--atbl-control-height` | Inherited theme value      | Default button minimum height. | `2.375rem`                                                 |

### Shape

| Token                   | Scope                 | Purpose                | Default |
| ----------------------- | --------------------- | ---------------------- | ------- |
| `--atbl-radius-control` | Inherited theme value | Control corner radius. | `7px`   |
| `--atbl-radius-surface` | Inherited theme value | Surface corner radius. | `12px`  |
| `--atbl-radius-overlay` | Inherited theme value | Overlay corner radius. | `16px`  |

### Elevation

| Token                   | Scope                 | Purpose            | Default                         |
| ----------------------- | --------------------- | ------------------ | ------------------------------- |
| `--atbl-shadow-surface` | Inherited theme value | Surface elevation. | `0 3px 16px rgb(20 28 40 / 5%)` |
| `--atbl-shadow-overlay` | Inherited theme value | Overlay elevation. | `0 18px 50px rgb(0 0 0 / 16%)`  |
| `--atbl-shadow-control` | Inherited theme value | Control elevation. | `0 1px 3px rgb(0 0 0 / 10%)`    |

### Cursors

| Token                    | Scope                 | Purpose                                                 | Default    |
| ------------------------ | --------------------- | ------------------------------------------------------- | ---------- |
| `--atbl-cursor-action`   | Inherited theme value | Enabled interactive controls.                           | `pointer`  |
| `--atbl-cursor-disabled` | Inherited theme value | Disabled controls.                                      | `default`  |
| `--atbl-cursor-help`     | Inherited theme value | Definition and timestamp details.                       | `help`     |
| `--atbl-cursor-busy`     | Inherited theme value | Ongoing action cursor; independent from disabled state. | `progress` |

### Motion

| Token                    | Scope                 | Purpose                      | Default                          |
| ------------------------ | --------------------- | ---------------------------- | -------------------------------- |
| `--atbl-duration-fast`   | Inherited theme value | Fast interaction duration.   | `120ms`                          |
| `--atbl-duration-normal` | Inherited theme value | Normal interaction duration. | `180ms`                          |
| `--atbl-duration-slow`   | Inherited theme value | Slow interaction duration.   | `240ms`                          |
| `--atbl-ease-standard`   | Inherited theme value | Standard transition easing.  | `ease`                           |
| `--atbl-ease-enter`      | Inherited theme value | Overlay entrance easing.     | `cubic-bezier(0.2, 0.7, 0.2, 1)` |

### Controls

| Token                             | Scope                 | Purpose                                  | Default    |
| --------------------------------- | --------------------- | ---------------------------------------- | ---------- |
| `--atbl-control-compact-height`   | Inherited theme value | Explicit compact control minimum height. | `1.875rem` |
| `--atbl-control-icon-size`        | Inherited theme value | Default action icon size.                | `1rem`     |
| `--atbl-control-padding-inline`   | Inherited theme value | Control horizontal padding.              | `.75rem`   |
| `--atbl-control-padding-block`    | Inherited theme value | Control vertical padding.                | `.375rem`  |
| `--atbl-control-gap`              | Inherited theme value | Control label and icon spacing.          | `.5rem`    |
| `--atbl-control-disabled-opacity` | Inherited theme value | Disabled control opacity.                | `.5`       |

### States

| Token                             | Scope                      | Purpose                                        | Default                                                        |
| --------------------------------- | -------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `--atbl-control-hover-surface`    | Computed component default | Enabled control hover fill.                    | `var(--atbl-subtle)`                                           |
| `--atbl-control-pressed-surface`  | Computed component default | Pressed control fill.                          | `color-mix(in srgb, var(--atbl-text) 8%, var(--atbl-surface))` |
| `--atbl-control-selected-surface` | Computed component default | Selected option or toggled control fill.       | `var(--atbl-accent-subtle)`                                    |
| `--atbl-control-selected-text`    | Computed component default | Selected option or toggled control foreground. | `var(--atbl-accent)`                                           |

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
