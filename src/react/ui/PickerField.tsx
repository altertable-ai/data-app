import type { ReactNode } from 'react';

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
