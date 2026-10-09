import { Button } from '@/src/react/ui/Button';
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
        <Button variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
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
