import { type ReactNode } from 'react';
import { AppIcon } from './icons.ts';

/** Inline labels sit with the value; above and beside labels have a separate layout slot. */
export type ControlLabelPlacement = 'inline' | 'above' | 'beside';

/** Popup triggers retain their accessible names when the visible label moves outside. */
export function PickerField({
  label,
  labelPlacement,
  children,
}: {
  label: string;
  labelPlacement?: ControlLabelPlacement;
  children: ReactNode;
}) {
  if (!labelPlacement || labelPlacement === 'inline') return children;
  return (
    <div className="altertable-field" data-label-placement={labelPlacement}>
      <span className="altertable-field-label" aria-hidden="true">
        {label}
      </span>
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
