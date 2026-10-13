import type { ReactNode } from 'react';
import { Button } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';

/** Inline labels sit with the value; above and beside labels have a separate layout slot. */
export type ControlLabelPlacement = 'inline' | 'above' | 'beside';

/** Popup triggers retain their accessible names when the visible label moves outside. */
export function PickerField({
  label,
  labelPlacement,
  labelAction,
  disabled,
  variant,
  children,
}: {
  label: string;
  labelPlacement?: ControlLabelPlacement;
  labelAction?: () => void;
  disabled?: boolean;
  variant?: 'outline' | 'ghost';
  children: ReactNode;
}) {
  if (!labelPlacement || labelPlacement === 'inline') return children;
  return (
    <div
      className="altertable-field"
      data-label-placement={labelPlacement}
      data-label-action={labelAction ? true : undefined}
      data-variant={variant}
    >
      {labelAction ? (
        <Button
          variant="ghost"
          size="compact"
          onClick={labelAction}
          disabled={disabled}
          aria-label={`Group by ${label}`}
        >
          {label}
        </Button>
      ) : (
        <span className="altertable-field-label" aria-hidden="true">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

/** Shared label, value, and disclosure layout for selection and predicate controls. */
export function PickerTriggerContent({
  label,
  labelPlacement,
  value,
}: {
  label: string;
  labelPlacement: ControlLabelPlacement;
  value: ReactNode;
}) {
  return (
    <>
      {labelPlacement === 'inline' && (
        <span className="altertable-picker-label" aria-hidden="true">
          {label}
        </span>
      )}
      <strong className="altertable-picker-value">{value}</strong>
      <AppIcon name="disclosure" size={14} />
    </>
  );
}
