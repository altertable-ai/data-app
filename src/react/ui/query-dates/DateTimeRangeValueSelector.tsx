import { useId, useState } from 'react';
import { Button } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';
import { formatVariableDate } from '@/src/react/ui/query-dates/resolve-date';
import type { DateTimeRange } from '@/src/core/query-variables';

/** Two UTC calendar dates; an empty field leaves that end of the range open. */
export function DateTimeRangeValueSelector({
  label,
  value,
  onChange,
  nullable = false,
  isAllowed = () => true,
}: {
  label: string;
  value: DateTimeRange | null;
  onChange: (value: DateTimeRange | null) => void;
  nullable?: boolean;
  options?: readonly (DateTimeRange | null)[];
  isAllowed?: (value: DateTimeRange | null) => boolean;
}) {
  const errorId = useId();
  const source = JSON.stringify(value);
  const [draft, setDraft] = useState<{
    source: string;
    from: string;
    to: string;
    error: string;
  } | null>(null);
  const current =
    draft?.source === source
      ? draft
      : {
          from: value?.from ? formatVariableDate(value.from) : '',
          to: value?.to ? formatVariableDate(value.to) : '',
          error: '',
        };
  function change(endpoint: 'from' | 'to', date: string) {
    const next = { ...current, [endpoint]: date };
    if (next.from && next.to && next.from > next.to) {
      setDraft({
        ...next,
        source,
        error: 'End date must be on or after start date.',
      });
      return;
    }
    const range = {
      from: next.from ? new Date(`${next.from}T00:00:00.000Z`) : null,
      to: next.to ? new Date(`${next.to}T23:59:59.999Z`) : null,
    };
    if (!isAllowed(range)) {
      setDraft({ ...next, source, error: 'Choose an allowed range.' });
      return;
    }
    setDraft(null);
    onChange(range);
  }
  return (
    <fieldset aria-label={label} className="altertable-query-date-fields">
      <div className="altertable-query-date-control altertable-query-date-range-control">
        <span className="altertable-query-date-label" aria-hidden="true">
          {label}
        </span>
        <input
          type="date"
          aria-label={`${label} from`}
          value={current.from}
          max={current.to || undefined}
          aria-invalid={!!current.error || undefined}
          aria-describedby={current.error ? errorId : undefined}
          onChange={event => change('from', event.target.value)}
        />
        <span className="altertable-query-date-separator" aria-hidden="true">
          –
        </span>
        <input
          type="date"
          aria-label={`${label} to`}
          value={current.to}
          min={current.from || undefined}
          aria-invalid={!!current.error || undefined}
          aria-describedby={current.error ? errorId : undefined}
          onChange={event => change('to', event.target.value)}
        />
        {nullable && (
          <Button
            variant="ghost"
            size="icon-compact"
            aria-label={`Clear ${label}`}
            onClick={() => {
              setDraft(null);
              onChange(null);
            }}
          >
            <AppIcon name="close" size={14} />
          </Button>
        )}
      </div>
      {current.error && (
        <p id={errorId} role="alert">
          {current.error}
        </p>
      )}
    </fieldset>
  );
}
