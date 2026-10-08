import { Button } from '@/src/react/ui/Button';
import { IconButton } from '@/src/react/ui/IconButton';
import { AppIcon } from '@/src/react/ui/icons';
export type FilterChipProps = { label: string; onRemove: () => void };
export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <Button
      className="altertable-filter-chip"
      aria-label={`Remove ${label}`}
      onClick={onRemove}
    >
      {label}
      <AppIcon name="close" size={14} />
    </Button>
  );
}
export type ActiveFilter = FilterChipProps & { id: string };
export function ActiveFilters({
  filters,
}: {
  filters: readonly ActiveFilter[];
}) {
  if (!filters.length) return null;
  return (
    <ul className="altertable-active-filters" aria-label="Active filters">
      {filters.map(filter => (
        <li key={filter.id}>
          <FilterChip label={filter.label} onRemove={filter.onRemove} />
        </li>
      ))}
    </ul>
  );
}
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
          icon="close"
          label="Clear filters"
          variant="ghost"
          onClick={onClear}
        />
      )}
      {onCancel && (
        <Button size="compact" onClick={onCancel}>
          Cancel
        </Button>
      )}
      {onApply && (
        <Button size="compact" variant="elevated" onClick={onApply}>
          Apply filters
        </Button>
      )}
    </fieldset>
  );
}
