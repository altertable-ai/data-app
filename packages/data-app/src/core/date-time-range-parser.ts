import * as chrono from 'chrono-node';

import type {
  DateTimeRange,
  RelativeDateTime,
  RelativeUnit,
} from './date-time-range.ts';

// Adapted from the frontend parser. Absolute fields are encoded as UTC,
// while relative anchors remain unevaluated for the backend.

export type DateTimeRangeParseFailureReason =
  | 'empty'
  | 'unrecognized'
  | 'invalid-range'
  | 'ambiguous';

export type DateTimeRangeParserOptions = {
  /** UTC-encoded reference fields for omitted dates/years. Defaults to the current UTC date/time. */
  now?: Date;
};

export type ParseDateTimeRangeResult =
  | {
      ok: true;
      range: DateTimeRange;
      normalizedInput: string;
      parser:
        | 'relative'
        | 'calendar-preset'
        | 'calendar-range'
        | 'unix'
        | 'chrono';
    }
  | {
      ok: false;
      reason: DateTimeRangeParseFailureReason;
      normalizedInput: string;
    };

type ParseSuccess = Extract<ParseDateTimeRangeResult, { ok: true }>;

// Input whitespace is normalized to single spaces before matching.
const RANGE_SEPARATOR_PATTERN = / ?(?:-|–|—| to ) ?/i;

const RELATIVE_UNIT_PATTERNS: ReadonlyArray<{
  unit: RelativeUnit;
  patterns: readonly string[];
}> = [
  {
    unit: 'SECOND',
    patterns: ['seconds', 'second', 'secs', 'sec', 's'],
  },
  {
    unit: 'MINUTE',
    patterns: ['minutes', 'minute', 'mins', 'min', 'mn', 'm'],
  },
  {
    unit: 'HOUR',
    patterns: ['hours', 'hour', 'hrs', 'hr', 'h'],
  },
  {
    unit: 'DAY',
    patterns: ['days', 'day', 'd'],
  },
  {
    unit: 'WEEK',
    patterns: ['weeks', 'week', 'wks', 'wk', 'w'],
  },
  {
    unit: 'MONTH',
    patterns: ['months', 'month', 'mos', 'mo', 'mon'],
  },
  {
    unit: 'YEAR',
    patterns: ['years', 'year', 'yrs', 'yr', 'y'],
  },
];

const RELATIVE_UNIT_BY_PATTERN = new Map(
  RELATIVE_UNIT_PATTERNS.flatMap(({ unit, patterns }) =>
    patterns.map(pattern => [pattern, unit] as const)
  )
);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const RELATIVE_UNIT_PATTERN = [...RELATIVE_UNIT_BY_PATTERN.keys()]
  .sort((left, right) => right.length - left.length)
  .map(escapeRegex)
  .join('|');

const SLIDING_RELATIVE_PATTERN = new RegExp(
  `^(?:last|past)\\s+(?:(\\d+)\\s*)?(${RELATIVE_UNIT_PATTERN})$`,
  'i'
);

const AGO_RELATIVE_PATTERN = new RegExp(
  `^(\\d+)\\s*(${RELATIVE_UNIT_PATTERN})\\s+ago$`,
  'i'
);

const BARE_RELATIVE_PATTERN = new RegExp(
  `^(\\d+)\\s*(${RELATIVE_UNIT_PATTERN})$`,
  'i'
);

const SINCE_PREFIX_PATTERN = /^(?:since|from) (.+)$/i;

const UNIX_TIMESTAMP_PATTERN = /^\d+$/;

const NOW_KEYWORDS = new Set(['now', 'today']);

function normalizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function getParserContext(options?: DateTimeRangeParserOptions) {
  const now = options?.now ?? new Date();
  return { now, reference: { instant: now, timezone: 'UTC' } };
}

/** Construct wall-clock fields without interpreting the runtime timezone. */
function utcDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date;
}

function parseRelativeUnit(rawUnit: string): RelativeUnit | null {
  return RELATIVE_UNIT_BY_PATTERN.get(rawUnit.toLowerCase()) ?? null;
}

function relativeFromNowOffset(
  amount: number,
  unit: RelativeUnit
): RelativeDateTime {
  return {
    anchor: 'RELATIVE_ANCHOR_NOW',
    offset: [{ amount: -amount, unit }],
  };
}

function success(
  range: DateTimeRange,
  normalizedInput: string,
  parser: ParseSuccess['parser']
): ParseSuccess {
  return { ok: true, range, normalizedInput, parser };
}

function failure(
  reason: DateTimeRangeParseFailureReason,
  normalizedInput: string
): ParseDateTimeRangeResult {
  return { ok: false, reason, normalizedInput };
}

function parseUnixTimestamp(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!UNIX_TIMESTAMP_PATTERN.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return null;
  }

  const date = trimmed.length <= 10 ? new Date(value * 1_000) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dateFromChronoComponents(
  components: chrono.ParsedComponents
): Date | null {
  const year = components.get('year');
  const month = components.get('month');
  const day = components.get('day');
  const hour = components.get('hour');
  const minute = components.get('minute');
  const second = components.get('second');
  const millisecond = components.get('millisecond');

  if (year === null || month === null || day === null) {
    return null;
  }

  return utcDate(
    year,
    month - 1,
    day,
    hour ?? 0,
    minute ?? 0,
    second ?? 0,
    millisecond ?? 0
  );
}

// Chrono validates calendar fields using local Date construction, which rejects
// wall-clock times in the host's DST gap. Validate these parse-local components
// as UTC fields instead, without changing Chrono's global parser or prototypes.
const wallClockParser = chrono.casual.clone();
wallClockParser.refiners = wallClockParser.refiners.map(refiner => ({
  refine(context, results) {
    for (const result of results) {
      for (const components of [result.start, result.end]) {
        if (!components) continue;
        components.isValidDate = () => {
          const date = dateFromChronoComponents(components);
          return (
            date !== null &&
            Number.isFinite(date.getTime()) &&
            date.getUTCFullYear() === components.get('year') &&
            date.getUTCMonth() + 1 === components.get('month') &&
            date.getUTCDate() === components.get('day') &&
            date.getUTCHours() === (components.get('hour') ?? 0) &&
            date.getUTCMinutes() === (components.get('minute') ?? 0)
          );
        };
      }
    }
    return refiner.refine(context, results);
  },
}));

function parseAbsoluteResult(
  text: string,
  reference: chrono.ParsingReference
): chrono.ParsedResult | null | 'ambiguous' {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const results = wallClockParser.parse(trimmed, reference, {
    forwardDate: false,
  });
  if (results.length === 0) {
    return null;
  }

  const parsed = results[0];
  if (!parsed) {
    return null;
  }

  if (parsed.index !== 0 || parsed.text.length !== trimmed.length) {
    return null;
  }

  if (results.length > 1) {
    const firstStart = parsed.start.date().getTime();
    const hasDistinctInterpretation = results.some(
      result => result.start.date().getTime() !== firstStart
    );
    if (hasDistinctInterpretation) {
      return 'ambiguous';
    }
  }

  return parsed;
}

function parseAbsoluteDateTime(
  text: string,
  reference: chrono.ParsingReference,
  end = false
): Date | null | 'ambiguous' {
  const parsed = parseAbsoluteResult(text, reference);
  if (!parsed || parsed === 'ambiguous') {
    return parsed;
  }

  if (parsed.end) return null;
  return absoluteBoundary(parsed.start, end);
}

function absoluteBoundary(
  components: chrono.ParsedComponents,
  end = false
): Date | null {
  const date = dateFromChronoComponents(components);
  if (date && !components.isCertain('hour')) {
    date.setUTCHours(0, 0, 0, 0);
    if (end) date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

function isNowKeyword(text: string): boolean {
  return NOW_KEYWORDS.has(text.trim().toLowerCase());
}

const CALENDAR_MONTH_PATTERN =
  /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?$/i;

const CALENDAR_MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

function parseCalendarPeriod(text: string) {
  if (/^\d{4}$/.test(text)) {
    return { year: Number(text), month: 0, months: 12 };
  }

  const match = text.match(CALENDAR_MONTH_PATTERN);
  if (!match?.[1]) {
    return null;
  }

  return {
    year: match[2] ? Number(match[2]) : null,
    month: CALENDAR_MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()),
    months: 1,
  };
}

function tryParseCalendarRange(
  normalized: string,
  now: Date
): ParseDateTimeRangeResult | null {
  const parts = normalized.split(RANGE_SEPARATOR_PATTERN);
  if (parts.length > 2) {
    return null;
  }

  const first = parseCalendarPeriod(parts[0] ?? '');
  const last = parts.length === 1 ? first : parseCalendarPeriod(parts[1] ?? '');
  if (!first || !last || first.months !== last.months) {
    return null;
  }

  const currentYear = now.getUTCFullYear();
  const fromYear = first.year ?? last.year ?? currentYear;
  const toYear = last.year ?? first.year ?? currentYear;
  const from = utcDate(fromYear, first.month, 1);
  const to = utcDate(toYear, last.month + last.months, 1);

  if (from.getTime() >= to.getTime()) {
    return failure('invalid-range', normalized);
  }

  return success({ from, to }, normalized, 'calendar-range');
}

function tryParseUnixRange(
  normalized: string
): ParseSuccess | ParseDateTimeRangeResult | null {
  const parts = normalized.split(RANGE_SEPARATOR_PATTERN);
  if (parts.length !== 2) {
    return null;
  }

  const fromPart = parts.at(0);
  const toPart = parts.at(1);
  if (!fromPart || !toPart) {
    return null;
  }

  const from = parseUnixTimestamp(fromPart);
  if (from && isNowKeyword(toPart)) {
    return success({ from, to: null }, normalized, 'unix');
  }

  const to = parseUnixTimestamp(toPart);
  if (!from || !to) {
    return null;
  }

  if (from.getTime() > to.getTime()) {
    return failure('invalid-range', normalized);
  }

  return success({ from, to }, normalized, 'unix');
}

function tryParseSlidingRelative(normalized: string): ParseSuccess | null {
  const match = normalized.match(SLIDING_RELATIVE_PATTERN);
  if (!match) {
    return null;
  }

  const amount = match[1] ? Number(match[1]) : 1;
  const unit = parseRelativeUnit(match[2] ?? '');
  if (!Number.isSafeInteger(amount) || amount <= 0 || !unit) {
    return null;
  }

  return success(
    {
      from: relativeFromNowOffset(amount, unit),
      to: null,
    },
    normalized,
    'relative'
  );
}

function tryParseCalendarPreset(normalized: string): ParseSuccess | null {
  const lower = normalized.toLowerCase();

  if (lower === 'today') {
    return success(
      {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_TODAY',
          offset: [],
        },
        to: null,
      },
      normalized,
      'calendar-preset'
    );
  }

  if (lower === 'yesterday') {
    return success(
      {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_YESTERDAY',
          offset: [],
        },
        to: {
          anchor: 'RELATIVE_ANCHOR_START_OF_TODAY',
          offset: [],
        },
      },
      normalized,
      'calendar-preset'
    );
  }

  if (lower === 'week to date' || lower === 'wtd') {
    return success(
      {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_WEEK',
          offset: [],
        },
        to: null,
      },
      normalized,
      'calendar-preset'
    );
  }

  if (lower === 'month to date' || lower === 'mtd') {
    return success(
      {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_MONTH',
          offset: [],
        },
        to: null,
      },
      normalized,
      'calendar-preset'
    );
  }

  if (lower === 'year to date' || lower === 'ytd') {
    return success(
      {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_YEAR',
          offset: [],
        },
        to: null,
      },
      normalized,
      'calendar-preset'
    );
  }

  return null;
}

function tryParseAgoRelative(normalized: string): ParseSuccess | null {
  const match = normalized.match(AGO_RELATIVE_PATTERN);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = parseRelativeUnit(match[2] ?? '');
  if (!Number.isSafeInteger(amount) || amount <= 0 || !unit) {
    return null;
  }

  return success(
    {
      from: relativeFromNowOffset(amount, unit),
      to: null,
    },
    normalized,
    'relative'
  );
}

function tryParseBareRelative(normalized: string): ParseSuccess | null {
  const match = normalized.match(BARE_RELATIVE_PATTERN);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = parseRelativeUnit(match[2] ?? '');
  if (!Number.isSafeInteger(amount) || amount <= 0 || !unit) {
    return null;
  }

  return success(
    {
      from: relativeFromNowOffset(amount, unit),
      to: null,
    },
    normalized,
    'relative'
  );
}

function tryParseSinceRelative(
  normalized: string
): ParseSuccess | ParseDateTimeRangeResult | null {
  const match = normalized.match(SINCE_PREFIX_PATTERN);
  if (!match) {
    return null;
  }

  const remainder = match[1]?.trim();
  if (!remainder) {
    return failure('unrecognized', normalized);
  }

  const agoMatch = remainder.match(AGO_RELATIVE_PATTERN);
  if (agoMatch) {
    const amount = Number(agoMatch[1]);
    const unit = parseRelativeUnit(agoMatch[2] ?? '');
    if (!Number.isSafeInteger(amount) || amount <= 0 || !unit) {
      return failure('unrecognized', normalized);
    }

    return success(
      {
        from: relativeFromNowOffset(amount, unit),
        to: null,
      },
      normalized,
      'relative'
    );
  }

  return null;
}

function tryParseSinceAbsolute(
  normalized: string,
  reference: chrono.ParsingReference
): ParseSuccess | ParseDateTimeRangeResult | null {
  const match = normalized.match(SINCE_PREFIX_PATTERN);
  if (!match) {
    return null;
  }

  const remainder = match[1]?.trim();
  if (!remainder) {
    return failure('unrecognized', normalized);
  }

  const range = tryParseAbsoluteRange(remainder, reference);
  if (range) return { ...range, normalizedInput: normalized };
  const absolute = parseAbsoluteDateTime(remainder, reference);
  if (absolute === 'ambiguous') {
    return failure('ambiguous', normalized);
  }
  if (!absolute) {
    return failure('unrecognized', normalized);
  }

  return success({ from: absolute, to: null }, normalized, 'chrono');
}

function tryParseAbsoluteRange(
  normalized: string,
  reference: chrono.ParsingReference
): ParseSuccess | ParseDateTimeRangeResult | null {
  const parts = normalized.split(RANGE_SEPARATOR_PATTERN);
  if (parts.length !== 2) {
    return null;
  }

  const fromPart = parts.at(0)?.trim();
  const toPart = parts.at(1)?.trim();
  if (!fromPart || !toPart) {
    return null;
  }

  if (isNowKeyword(toPart)) {
    const from = parseAbsoluteDateTime(fromPart, reference);
    if (from === 'ambiguous') {
      return failure('ambiguous', normalized);
    }
    if (!from) {
      return null;
    }

    return success({ from, to: null }, normalized, 'chrono');
  }

  // Parse both ends together so an explicit year is shared with the other bound.
  const paired = parseAbsoluteResult(normalized, reference);
  if (paired === 'ambiguous') return failure('ambiguous', normalized);
  if (paired?.end) {
    const from = absoluteBoundary(paired.start);
    const to = absoluteBoundary(paired.end, true);
    if (!from || !to) return null;
    if (from.getTime() >= to.getTime())
      return failure('invalid-range', normalized);
    return success({ from, to }, normalized, 'chrono');
  }
  const from = parseAbsoluteDateTime(fromPart, reference);
  if (from === 'ambiguous') {
    return failure('ambiguous', normalized);
  }

  const to = parseAbsoluteDateTime(toPart, reference, true);
  if (to === 'ambiguous') {
    return failure('ambiguous', normalized);
  }

  if (!from || !to) {
    return null;
  }

  if (from.getTime() > to.getTime()) {
    return failure('invalid-range', normalized);
  }

  return success({ from, to }, normalized, 'chrono');
}

function tryParseAbsoluteDay(
  normalized: string,
  reference: chrono.ParsingReference
): ParseSuccess | ParseDateTimeRangeResult | null {
  const parsed = parseAbsoluteResult(normalized, reference);
  if (parsed === 'ambiguous') {
    return failure('ambiguous', normalized);
  }
  if (
    !parsed ||
    parsed.end ||
    !parsed.start.isCertain('month') ||
    !parsed.start.isCertain('day') ||
    parsed.start.isCertain('hour')
  ) {
    return null;
  }

  const year = parsed.start.get('year');
  const month = parsed.start.get('month');
  const day = parsed.start.get('day');
  if (year === null || month === null || day === null) {
    return null;
  }

  const from = utcDate(year, month - 1, day);
  const to = utcDate(year, month - 1, day + 1);

  return success({ from, to }, normalized, 'chrono');
}

export function parseDateTimeRangeInput(
  input: string,
  options?: DateTimeRangeParserOptions
): ParseDateTimeRangeResult {
  const normalizedInput = normalizeInput(input);

  if (!normalizedInput) {
    return failure('empty', normalizedInput);
  }

  const { reference, now } = getParserContext(options);

  if (!Number.isFinite(now.getTime()))
    return failure('invalid-range', normalizedInput);

  const attempts: Array<() => ParseSuccess | ParseDateTimeRangeResult | null> =
    [
      () => tryParseCalendarRange(normalizedInput, now),
      () => tryParseUnixRange(normalizedInput),
      () => tryParseSlidingRelative(normalizedInput),
      () => tryParseCalendarPreset(normalizedInput),
      () => tryParseAgoRelative(normalizedInput),
      () => tryParseBareRelative(normalizedInput),
      () => tryParseSinceRelative(normalizedInput),
      () => tryParseSinceAbsolute(normalizedInput, reference),
      () => tryParseAbsoluteRange(normalizedInput, reference),
      () => tryParseAbsoluteDay(normalizedInput, reference),
    ];

  for (const attempt of attempts) {
    const result = attempt();
    if (!result) {
      continue;
    }

    if (!result.ok) {
      return result;
    }

    return result;
  }

  return failure('unrecognized', normalizedInput);
}

export function canParseDateTimeRangeInput(
  input: string,
  options?: DateTimeRangeParserOptions
): boolean {
  return parseDateTimeRangeInput(input, options).ok;
}
