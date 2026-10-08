/** Decorative selection indicator; the containing control owns its accessible semantics. */
export function SelectionMark({
  selected,
  multiple = true,
}: {
  selected: boolean;
  multiple?: boolean;
}) {
  return (
    <span
      className="altertable-selection-mark"
      data-selected={selected || undefined}
      data-multiple={multiple || undefined}
      aria-hidden="true"
    />
  );
}
