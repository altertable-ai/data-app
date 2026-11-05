import { formatDateTime } from '@altertable/data-app/format';

type DateTimeRangeSegmentKind = 'month' | 'day' | 'year' | 'hour' | 'minute';

type DateTimeRangeSegment = {
  kind: DateTimeRangeSegmentKind;
  endpointIndex: number;
  start: number;
  end: number;
};

type DateTimeRangeEndpoint = {
  start: number;
  end: number;
  month: number;
  day: number;
  year: number;
  hour: number;
  minute: number;
  segments: DateTimeRangeSegment[];
};

type DateTimeRangeInputSelection = {
  start: number;
  end: number;
};

type DateTimeRangeInputEdit = DateTimeRangeInputSelection & {
  value: string;
};

export function getDateTimeRangeInputSegmentSelection({
  value,
  locale = 'en-US',
  dateOnly = false,
  selectionStart,
  selectionEnd,
  direction,
}: {
  value: string;
  locale?: string;
  dateOnly?: boolean;
  selectionStart: number;
  selectionEnd: number;
  direction: -1 | 1;
}): DateTimeRangeInputSelection | null {
  const segments = getDateTimeRangeEndpoints(value, locale, dateOnly).flatMap(
    endpoint => endpoint.segments
  );
  const selectedIndex = segments.findIndex(
    segment => segment.start === selectionStart && segment.end === selectionEnd
  );

  if (selectedIndex >= 0) {
    const adjacentIndex = selectedIndex + direction;
    const adjacentSegment =
      adjacentIndex >= 0 && adjacentIndex < segments.length
        ? segments.at(adjacentIndex)
        : undefined;
    if (adjacentSegment) {
      return toSelection(adjacentSegment);
    }

    const cursorPosition = direction === -1 ? 0 : value.length;
    return { start: cursorPosition, end: cursorPosition };
  }

  if (selectionStart !== selectionEnd) {
    return null;
  }

  const segment =
    direction === 1
      ? segments.find(candidate => candidate.end > selectionStart)
      : segments.findLast(candidate => candidate.start < selectionStart);

  return toSelection(segment);
}

export function editDateTimeRangeInputSegment({
  value,
  locale = 'en-US',
  dateOnly = false,
  selectionStart,
  selectionEnd,
  direction,
}: {
  value: string;
  locale?: string;
  dateOnly?: boolean;
  selectionStart: number;
  selectionEnd: number;
  direction: -1 | 1;
}): DateTimeRangeInputEdit | null {
  const endpoints = getDateTimeRangeEndpoints(value, locale, dateOnly);
  const segment = endpoints
    .flatMap(endpoint => endpoint.segments)
    .find(
      candidate =>
        candidate.start === selectionStart && candidate.end === selectionEnd
    );
  if (!segment) {
    return null;
  }

  const endpoint = endpoints.at(segment.endpointIndex);
  if (!endpoint) {
    return null;
  }

  const editedEndpoint = editEndpoint(endpoint, segment.kind, direction);
  const nextEndpointValue = formatEndpoint(editedEndpoint, locale, dateOnly);
  const nextValue = `${value.slice(0, endpoint.start)}${nextEndpointValue}${value.slice(endpoint.end)}`;
  const nextSegment = getDateTimeRangeEndpoints(nextValue, locale, dateOnly)
    .at(segment.endpointIndex)
    ?.segments.find(candidate => candidate.kind === segment.kind);

  if (!nextSegment) {
    return null;
  }

  return {
    value: nextValue,
    start: nextSegment.start,
    end: nextSegment.end,
  };
}

/** Convert only complete, formatter-produced endpoints; natural-language input stays untouched. */
export function normalizeDateTimeRangeInput(
  value: string,
  locale: string,
  dateOnly = false
): string {
  const endpoints = getDateTimeRangeEndpoints(value, locale, dateOnly);
  // Natural-language dates retain inclusive end days; ISO bounds denote exclusive instants.
  for (const endpoint of endpoints.toReversed()) {
    value = `${value.slice(0, endpoint.start)}${dateOnly ? formatEndpoint(endpoint, 'en-US', true) : endpointDate(endpoint).toISOString()}${value.slice(endpoint.end)}`;
  }
  return value;
}

function getDateTimeRangeEndpoints(
  value: string,
  locale: string,
  dateOnly: boolean
): DateTimeRangeEndpoint[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...(dateOnly ? {} : { timeStyle: 'short' as const }),
    hourCycle: 'h23',
    timeZone: 'UTC',
  });
  const sample = formatter.formatToParts(
    new Date(Date.UTC(2026, 10, 22, 16, 45))
  );
  const months = Array.from(
    { length: 12 },
    (_, month) =>
      formatter
        .formatToParts(new Date(Date.UTC(2026, month, 22)))
        .find(part => part.type === 'month')!.value
  );
  const number = new Intl.NumberFormat(locale, { useGrouping: false });
  const digits = Array.from({ length: 10 }, (_, digit) => number.format(digit));
  function parseNumber(text: string) {
    return Number(
      Array.from(text, char => {
        const digit = digits.indexOf(char);
        return digit < 0 ? char : String(digit);
      }).join('')
    );
  }
  const fields: DateTimeRangeSegmentKind[] = [];
  const pattern = sample
    .map(part => {
      if (part.type === 'literal') return RegExp.escape(part.value);
      if (!['month', 'day', 'year', 'hour', 'minute'].includes(part.type))
        return RegExp.escape(part.value);
      fields.push(part.type as DateTimeRangeSegmentKind);
      return part.type === 'month'
        ? `(${months.map(month => RegExp.escape(month)).join('|')})`
        : part.type === 'year'
          ? '(\\p{Decimal_Number}{1,4})'
          : '(\\p{Decimal_Number}{1,2})';
    })
    .join('');
  return [...value.matchAll(new RegExp(pattern, 'dgu'))].flatMap(
    (match, endpointIndex) => {
      const values = Object.fromEntries(
        fields.map((field, index) => [field, match[index + 1]!])
      );
      const endpoint: DateTimeRangeEndpoint = {
        start: match.index,
        end: match.index + match[0].length,
        month: months.indexOf(values.month!),
        day: parseNumber(values.day!),
        year: parseNumber(values.year!),
        hour: dateOnly ? 0 : parseNumber(values.hour!),
        minute: dateOnly ? 0 : parseNumber(values.minute!),
        segments: fields.map((field, index) => {
          const [start, end] = match.indices![index + 1]!;
          return createSegment(field, endpointIndex, start, end - start);
        }),
      };
      // Reject overflow and partial matches before interpreting localized text as dates.
      return formatEndpoint(endpoint, locale, dateOnly) === match[0]
        ? [endpoint]
        : [];
    }
  );
}

function createSegment(
  kind: DateTimeRangeSegmentKind,
  endpointIndex: number,
  start: number,
  length: number
): DateTimeRangeSegment {
  return { kind, endpointIndex, start, end: start + length };
}

function editEndpoint(
  endpoint: DateTimeRangeEndpoint,
  kind: DateTimeRangeSegmentKind,
  direction: -1 | 1
): DateTimeRangeEndpoint {
  const edited = { ...endpoint };

  switch (kind) {
    case 'month':
      edited.month = wrap(endpoint.month + direction, 0, 11);
      edited.day = Math.min(
        endpoint.day,
        getEndpointDaysInMonth(edited.year, edited.month)
      );
      break;
    case 'day':
      edited.day = wrap(
        endpoint.day + direction,
        1,
        getEndpointDaysInMonth(endpoint.year, endpoint.month)
      );
      break;
    case 'year':
      edited.year = wrap(endpoint.year + direction, 1, 9_999);
      edited.day = Math.min(
        endpoint.day,
        getEndpointDaysInMonth(edited.year, endpoint.month)
      );
      break;
    case 'hour':
      edited.hour = wrap(endpoint.hour + direction, 0, 23);
      break;
    case 'minute':
      edited.minute = wrap(endpoint.minute + direction, 0, 59);
      break;
  }

  return edited;
}

function endpointDate(endpoint: DateTimeRangeEndpoint): Date {
  const date = new Date(0);
  date.setUTCFullYear(endpoint.year, endpoint.month, endpoint.day);
  date.setUTCHours(endpoint.hour, endpoint.minute, 0, 0);
  return date;
}

function formatEndpoint(
  endpoint: DateTimeRangeEndpoint,
  locale: string,
  dateOnly: boolean
): string {
  if (dateOnly)
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(endpointDate(endpoint));
  return formatDateTime(endpointDate(endpoint), { locale, timeZone: 'UTC' });
}

function getEndpointDaysInMonth(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month + 1, 0);
  return date.getUTCDate();
}

function wrap(value: number, minimum: number, maximum: number): number {
  const size = maximum - minimum + 1;
  return ((value - minimum + size) % size) + minimum;
}

function toSelection(
  segment: DateTimeRangeSegment | undefined
): DateTimeRangeInputSelection | null {
  return segment ? { start: segment.start, end: segment.end } : null;
}
