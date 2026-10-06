import { useId, useState } from 'react';
import { formatVariableDate } from '@/src/react/ui/query-dates/resolve-date';
import type { AbsoluteOrRelativeDateTime } from '@/src/core/query-variables';

/** A single UTC calendar date. Existing relative values change only when edited. */
export function DateTimeValueSelector({
  label,
  value,
  onChange,
  nullable = false,
  isAllowed = () => true,
}: {
  label: string;
  value: AbsoluteOrRelativeDateTime | null;
  onChange: (value: AbsoluteOrRelativeDateTime | null) => void;
  nullable?: boolean;
  options?: readonly (AbsoluteOrRelativeDateTime | null)[];
  isAllowed?: (value: AbsoluteOrRelativeDateTime | null) => boolean;
}) {
  const errorId = useId();
  const source = JSON.stringify(value);
  const [draft, setDraft] = useState<{
    source: string;
    text: string;
    error: string;
  } | null>(null);
  const current =
    draft?.source === source
      ? draft
      : {
          text: value ? formatVariableDate(value) : '',
          error: '',
        };
  function change(text: string) {
    const date = text ? new Date(`${text}T00:00:00.000Z`) : null;
    const error =
      date && !Number.isFinite(date.getTime())
        ? 'Choose a valid date.'
        : !date && !nullable
          ? 'Choose a date.'
          : !isAllowed(date)
            ? 'Choose an allowed date.'
            : '';
    if (error) {
      setDraft({ source, text, error });
      return;
    }
    setDraft(null);
    onChange(date);
  }
  return (
    <div className="altertable-query-date-fields">
      <label className="altertable-query-date-control">
        <span className="altertable-query-date-label">{label}</span>
        <input
          type="date"
          aria-label={label}
          value={current.text}
          aria-invalid={!!current.error || undefined}
          aria-describedby={current.error ? errorId : undefined}
          onChange={event => change(event.target.value)}
        />
      </label>
      {current.error && (
        <p id={errorId} role="alert">
          {current.error}
        </p>
      )}
    </div>
  );
}
