type DateTimeRangeSegmentKind =
  | 'month'
  | 'day'
  | 'year'
  | 'hour'
  | 'minute'
  | 'period';

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
  period: 'AM' | 'PM';
  segments: DateTimeRangeSegment[];
};

type DateTimeRangeInputSelection = {
  start: number;
  end: number;
};

type DateTimeRangeInputEdit = DateTimeRangeInputSelection & {
  value: string;
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function getDateTimeRangeInputSegmentSelection({
  value,
  selectionStart,
  selectionEnd,
  direction,
}: {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  direction: -1 | 1;
}): DateTimeRangeInputSelection | null {
  const segments = getDateTimeRangeEndpoints(value).flatMap(
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
  selectionStart,
  selectionEnd,
  direction,
}: {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  direction: -1 | 1;
}): DateTimeRangeInputEdit | null {
  const endpoints = getDateTimeRangeEndpoints(value);
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
  const nextEndpointValue = formatEndpoint(editedEndpoint);
  const nextValue = `${value.slice(0, endpoint.start)}${nextEndpointValue}${value.slice(endpoint.end)}`;
  const nextSegment = getDateTimeRangeEndpoints(nextValue)
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

function getDateTimeRangeEndpoints(value: string): DateTimeRangeEndpoint[] {
  const pattern = new RegExp(
    `\\b(${MONTHS.join('|')}) (\\d{1,2}), (\\d{4}), (\\d{1,2}):(\\d{2}) (AM|PM)\\b`,
    'g'
  );

  return [...value.matchAll(pattern)].flatMap((match, endpointIndex) => {
    const [
      matchedValue,
      monthLabel,
      dayLabel,
      yearLabel,
      hourLabel,
      minuteLabel,
      period,
    ] = match;
    const start = match.index;

    if (
      !matchedValue ||
      !monthLabel ||
      !dayLabel ||
      !yearLabel ||
      !hourLabel ||
      !minuteLabel ||
      (period !== 'AM' && period !== 'PM')
    ) {
      return [];
    }

    const month = MONTHS.findIndex(candidate => candidate === monthLabel);
    if (month < 0) {
      return [];
    }

    const dayStart = start + monthLabel.length + 1;
    const yearStart = dayStart + dayLabel.length + 2;
    const hourStart = yearStart + yearLabel.length + 2;
    const minuteStart = hourStart + hourLabel.length + 1;
    const periodStart = minuteStart + minuteLabel.length + 1;

    return [
      {
        start,
        end: start + matchedValue.length,
        month,
        day: Number(dayLabel),
        year: Number(yearLabel),
        hour: Number(hourLabel),
        minute: Number(minuteLabel),
        period,
        segments: [
          createSegment('month', endpointIndex, start, monthLabel.length),
          createSegment('day', endpointIndex, dayStart, dayLabel.length),
          createSegment('year', endpointIndex, yearStart, yearLabel.length),
          createSegment('hour', endpointIndex, hourStart, hourLabel.length),
          createSegment(
            'minute',
            endpointIndex,
            minuteStart,
            minuteLabel.length
          ),
          createSegment('period', endpointIndex, periodStart, period.length),
        ],
      },
    ];
  });
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
      edited.hour = wrap(endpoint.hour + direction, 1, 12);
      break;
    case 'minute':
      edited.minute = wrap(endpoint.minute + direction, 0, 59);
      break;
    case 'period':
      edited.period = endpoint.period === 'AM' ? 'PM' : 'AM';
      break;
  }

  return edited;
}

function formatEndpoint(endpoint: DateTimeRangeEndpoint): string {
  const month = MONTHS.at(endpoint.month);
  if (!month) {
    return '';
  }

  return `${month} ${endpoint.day}, ${String(endpoint.year).padStart(4, '0')}, ${endpoint.hour}:${String(endpoint.minute).padStart(2, '0')} ${endpoint.period}`;
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
