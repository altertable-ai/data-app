import { Button } from '@/src/react/ui/Button';
import { IconButton } from '@/src/react/ui/IconButton';
export type FilterActionsProps = {
  onClear?: () => void;
} & (
  | { onApply: () => void; onCancel: () => void }
  | { onApply?: never; onCancel?: never }
);
export function FilterActions({
  onClear,
  onApply,
  onCancel,
}: FilterActionsProps) {
  return (
    <fieldset className="altertable-filter-actions">
      <legend className="altertable-sr-only">Filter actions</legend>
      {onClear && (
        <IconButton
          icon="clearFilters"
          label="Clear filters"
          variant="ghost"
          onClick={onClear}
        />
      )}
      {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      {onApply && (
        <Button variant="primary" onClick={onApply}>
          Apply filters
        </Button>
      )}
    </fieldset>
  );
}
