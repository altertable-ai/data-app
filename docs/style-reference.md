# Styling reference

Use components and typed props first; these names are supported customization hooks.
Inherited tokens are available to app-owned CSS. Optional component overrides use
native CSS fallbacks at the property that consumes them, so local inputs compose.

See [Styling](styling.md) for composition and ownership.

## Public tokens

### Surfaces

| Token               | Scope     | Purpose                       |
| ------------------- | --------- | ----------------------------- |
| `--atbl-background` | Inherited | Document canvas.              |
| `--atbl-surface`    | Inherited | Widget and overlay surface.   |
| `--atbl-subtle`     | Inherited | Quiet surface and hover fill. |
| `--atbl-backdrop`   | Inherited | Modal backdrop.               |

### Text and borders

| Token                         | Scope             | Purpose                                  |
| ----------------------------- | ----------------- | ---------------------------------------- |
| `--atbl-text`                 | Inherited         | Primary text.                            |
| `--atbl-muted`                | Inherited         | Secondary text.                          |
| `--atbl-border`               | Inherited         | Decorative dividers and surface borders. |
| `--atbl-control-hover-border` | Optional override | Hovered control border.                  |

### Accent and selection

| Token                  | Scope             | Purpose                                 |
| ---------------------- | ----------------- | --------------------------------------- |
| `--atbl-accent`        | Inherited         | Brand accent and selected controls.     |
| `--atbl-accent-hover`  | Optional override | Hovered accent.                         |
| `--atbl-accent-subtle` | Optional override | Quiet selected surface.                 |
| `--atbl-on-accent`     | Inherited         | Foreground on an accent-filled control. |

### Meaning

| Token                  | Scope             | Purpose                          |
| ---------------------- | ----------------- | -------------------------------- |
| `--atbl-positive`      | Optional override | Favorable metric change.         |
| `--atbl-negative`      | Optional override | Unfavorable metric change.       |
| `--atbl-danger`        | Inherited         | Error text and invalid controls. |
| `--atbl-danger-subtle` | Inherited         | Quiet error surface.             |

### Code

| Token                 | Scope             | Purpose             |
| --------------------- | ----------------- | ------------------- |
| `--atbl-code-surface` | Inherited         | Code block surface. |
| `--atbl-code-text`    | Inherited         | Code block text.    |
| `--atbl-code-keyword` | Optional override | SQL keywords.       |
| `--atbl-mono-font`    | Inherited         | Code font stack.    |

### Charts

| Token               | Scope             | Purpose                    |
| ------------------- | ----------------- | -------------------------- |
| `--atbl-chart-fill` | Optional override | Unselected bar fill.       |
| `--atbl-chart-1`    | Inherited         | Categorical chart color 1. |
| `--atbl-chart-2`    | Inherited         | Categorical chart color 2. |
| `--atbl-chart-3`    | Inherited         | Categorical chart color 3. |
| `--atbl-chart-4`    | Inherited         | Categorical chart color 4. |
| `--atbl-chart-5`    | Inherited         | Categorical chart color 5. |
| `--atbl-chart-6`    | Inherited         | Categorical chart color 6. |
| `--atbl-chart-7`    | Inherited         | Categorical chart color 7. |
| `--atbl-chart-8`    | Inherited         | Categorical chart color 8. |

### Focus

| Token                      | Scope             | Purpose                          |
| -------------------------- | ----------------- | -------------------------------- |
| `--atbl-focus-color`       | Optional override | Keyboard focus indicator color.  |
| `--atbl-focus-outline`     | Optional override | Complete keyboard focus outline. |
| `--atbl-focus-ring-offset` | Inherited         | Outer outline offset.            |
| `--atbl-focus-ring-inset`  | Inherited         | Inset outline offset.            |

### Typography

| Token                         | Scope             | Purpose                                  |
| ----------------------------- | ----------------- | ---------------------------------------- |
| `--atbl-font`                 | Inherited         | Body font stack.                         |
| `--atbl-font-heading`         | Optional override | Heading and metric font stack.           |
| `--atbl-type-emphasis-weight` | Inherited         | Primary title and value emphasis weight. |
| `--atbl-type-meta-weight`     | Inherited         | Supporting metadata weight.              |
| `--atbl-type-page-size`       | Inherited         | Page title size.                         |
| `--atbl-type-section-size`    | Inherited         | Section heading size.                    |
| `--atbl-type-widget-size`     | Inherited         | Widget heading size.                     |
| `--atbl-type-body-size`       | Inherited         | Narrative body text size.                |
| `--atbl-type-label-size`      | Inherited         | Control and metric label size.           |
| `--atbl-type-meta-size`       | Inherited         | Supporting metadata size.                |
| `--atbl-type-metric-size`     | Inherited         | Prominent metric value size.             |
| `--atbl-type-heading-weight`  | Inherited         | Section and widget heading weight.       |
| `--atbl-type-label-weight`    | Inherited         | Control label weight.                    |
| `--atbl-type-body-leading`    | Inherited         | Narrative line height.                   |
| `--atbl-type-label-leading`   | Inherited         | Control and metadata line height.        |
| `--atbl-type-heading-leading` | Inherited         | Section and widget heading line height.  |
| `--atbl-type-metric-leading`  | Inherited         | Metric value line height.                |
| `--atbl-text-measure`         | Inherited         | Maximum readable prose width.            |

### Layout

| Token                   | Scope             | Purpose                        |
| ----------------------- | ----------------- | ------------------------------ |
| `--atbl-space-xs`       | Inherited         | Spacing step xs.               |
| `--atbl-space-sm`       | Inherited         | Spacing step sm.               |
| `--atbl-space-md`       | Inherited         | Spacing step md.               |
| `--atbl-space-lg`       | Inherited         | Spacing step lg.               |
| `--atbl-space-xl`       | Inherited         | Spacing step xl.               |
| `--atbl-layout-gap`     | Optional override | Section and widget spacing.    |
| `--atbl-content-width`  | Inherited         | Maximum app content width.     |
| `--atbl-control-height` | Inherited         | Default button minimum height. |

### Shape

| Token                   | Scope     | Purpose                |
| ----------------------- | --------- | ---------------------- |
| `--atbl-radius-control` | Inherited | Control corner radius. |
| `--atbl-radius-surface` | Inherited | Surface corner radius. |
| `--atbl-radius-overlay` | Inherited | Overlay corner radius. |

### Elevation

| Token                   | Scope     | Purpose            |
| ----------------------- | --------- | ------------------ |
| `--atbl-shadow-surface` | Inherited | Surface elevation. |
| `--atbl-shadow-overlay` | Inherited | Overlay elevation. |
| `--atbl-shadow-control` | Inherited | Control elevation. |

### Cursors

| Token                    | Scope     | Purpose                                                 |
| ------------------------ | --------- | ------------------------------------------------------- |
| `--atbl-cursor-action`   | Inherited | Enabled interactive controls.                           |
| `--atbl-cursor-disabled` | Inherited | Disabled controls.                                      |
| `--atbl-cursor-help`     | Inherited | Definition and timestamp details.                       |
| `--atbl-cursor-busy`     | Inherited | Ongoing action cursor; independent from disabled state. |

### Motion

| Token                    | Scope     | Purpose                      |
| ------------------------ | --------- | ---------------------------- |
| `--atbl-duration-fast`   | Inherited | Fast interaction duration.   |
| `--atbl-duration-normal` | Inherited | Normal interaction duration. |
| `--atbl-duration-slow`   | Inherited | Slow interaction duration.   |
| `--atbl-ease-standard`   | Inherited | Standard transition easing.  |
| `--atbl-ease-enter`      | Inherited | Overlay entrance easing.     |

### Controls

| Token                             | Scope     | Purpose                                  |
| --------------------------------- | --------- | ---------------------------------------- |
| `--atbl-control-compact-height`   | Inherited | Explicit compact control minimum height. |
| `--atbl-control-icon-size`        | Inherited | Default action icon size.                |
| `--atbl-control-padding-inline`   | Inherited | Control horizontal padding.              |
| `--atbl-control-padding-block`    | Inherited | Control vertical padding.                |
| `--atbl-control-gap`              | Inherited | Control label and icon spacing.          |
| `--atbl-control-disabled-opacity` | Inherited | Disabled control opacity.                |

### States

| Token                             | Scope             | Purpose                                        |
| --------------------------------- | ----------------- | ---------------------------------------------- |
| `--atbl-control-hover-surface`    | Optional override | Enabled control hover fill.                    |
| `--atbl-control-pressed-surface`  | Optional override | Pressed control fill.                          |
| `--atbl-control-selected-surface` | Optional override | Selected option or toggled control fill.       |
| `--atbl-control-selected-text`    | Optional override | Selected option or toggled control foreground. |

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
