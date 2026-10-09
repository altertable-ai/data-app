import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/src/react/ui/Button';
import { FilterActions } from '@/src/react/ui/FilterActions';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { Stack } from '@/src/react/ui/Stack';

export type ControlGroup = {
  primary: ReactNode[];
  secondary: ReactNode[];
  activeSecondaryCount: number;
};

export function ViewFilterControls({
  groups,
  onClear,
}: {
  groups: Record<'scope' | 'display', ControlGroup>;
  onClear?: () => void;
}) {
  const hasDisplay =
    groups.display.primary.length + groups.display.secondary.length > 0;
  const hasScope =
    groups.scope.primary.length + groups.scope.secondary.length > 0;
  return (
    <Stack gap="sm">
      <FilterControlGroup
        controls={groups.scope}
        group="scope"
        showLabel={hasDisplay}
        onClear={hasScope || !hasDisplay ? onClear : undefined}
      />
      <FilterControlGroup
        controls={groups.display}
        group="display"
        showLabel
        onClear={hasDisplay && !hasScope ? onClear : undefined}
      />
    </Stack>
  );
}

function FilterControlGroup({
  controls,
  group,
  showLabel,
  onClear,
}: {
  controls: ControlGroup;
  group: 'scope' | 'display';
  showLabel: boolean;
  onClear?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const label = group === 'scope' ? 'Filters' : 'Display options';
  const moreLabel = group === 'scope' ? 'More filters' : 'More display options';
  const countLabel = group === 'scope' ? 'active' : 'changed';
  if (!controls.primary.length && !controls.secondary.length && !onClear)
    return null;
  return (
    <fieldset className="altertable-control-group">
      <legend className="altertable-sr-only">{label}</legend>
      <Stack gap="sm">
        <VariableBar aria-label={`Primary ${label.toLowerCase()}`}>
          {showLabel && (
            <span className="altertable-control-group-label">{label}</span>
          )}
          {controls.primary}
          {!!controls.secondary.length && (
            <Button
              aria-expanded={expanded}
              aria-controls={id}
              onClick={() => setExpanded(!expanded)}
            >
              {moreLabel}
              {controls.activeSecondaryCount > 0 &&
                ` (${controls.activeSecondaryCount} ${countLabel})`}
            </Button>
          )}
          {onClear && <FilterActions onClear={onClear} />}
        </VariableBar>
        <div id={id} hidden={!expanded}>
          {expanded && (
            <VariableBar
              aria-label={`Secondary ${label.toLowerCase()}`}
              className="altertable-secondary-controls"
            >
              {controls.secondary}
            </VariableBar>
          )}
        </div>
      </Stack>
    </fieldset>
  );
}
