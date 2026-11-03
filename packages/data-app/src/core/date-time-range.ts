/** Frontend-compatible range values. Absolute dates encode wall-clock fields as UTC,
 * not instants converted from a reporting timezone. The backend interprets that zone.
 */
export type AbsoluteOrRelativeDateTime = Date | RelativeDateTime;

export type DateTimeRange = {
  /** Inclusive start; null or omitted means unbounded. */
  from?: AbsoluteOrRelativeDateTime | null;
  /** Exclusive end; null or omitted means now. */
  to?: AbsoluteOrRelativeDateTime | null;
};

export type RelativeDateTime = {
  anchor: RelativeAnchor;
  offset: RelativeOffset[];
};

export type RelativeOffset = { amount: number; unit: RelativeUnit };

export type RelativeAnchor =
  | 'RELATIVE_ANCHOR_NOW'
  | 'RELATIVE_ANCHOR_START_OF_TODAY'
  | 'RELATIVE_ANCHOR_START_OF_YESTERDAY'
  | 'RELATIVE_ANCHOR_START_OF_TOMORROW'
  | 'RELATIVE_ANCHOR_START_OF_WEEK'
  | 'RELATIVE_ANCHOR_START_OF_MONTH'
  | 'RELATIVE_ANCHOR_START_OF_YEAR';

export type RelativeUnit =
  | 'SECOND'
  | 'MINUTE'
  | 'HOUR'
  | 'DAY'
  | 'WEEK'
  | 'MONTH'
  | 'YEAR';

/** Bounded, resolved wall-clock dates encoded in UTC, with an exclusive end. */
export type ResolvedDateTimeRange = { from: Date; to: Date };
