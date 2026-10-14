/*!
 * TypeScript port of d3-time 3.1.0 (ISC), https://github.com/d3/d3-time/tree/v3.1.0
 * Numeric tick-step helpers adapted from d3-array 3.2.4 (ISC).
 *
 * Copyright 2010-2022 Mike Bostock (d3-time)
 * Copyright 2010-2023 Mike Bostock (d3-array tick-step helpers)
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose
 * with or without fee is hereby granted, provided that the above copyright notice
 * and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
 * OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
 * THIS SOFTWARE.
 */

type DateValue = Date | number;
type DateMutation = (date: Date) => void;
type DateOffset = (date: Date, step: number) => void;
type DateCount = (start: Date, end: Date) => number;

export interface TimeInterval {
  (date?: DateValue): Date;
  floor(this: void, date: DateValue): Date;
  ceil(this: void, date: DateValue): Date;
  round(this: void, date: DateValue): Date;
  offset(this: void, date: DateValue, step?: number): Date;
  range(this: void, start: DateValue, stop: DateValue, step?: number): Date[];
  filter(this: void, test: (date: Date) => boolean): TimeInterval;
}

export interface CountableTimeInterval extends TimeInterval {
  count(this: void, start: DateValue, end: DateValue): number;
  every(this: void, step: number): TimeInterval | null;
}

export function timeInterval(
  floor: DateMutation,
  offset: DateOffset
): TimeInterval;
export function timeInterval(
  floor: DateMutation,
  offset: DateOffset,
  count: DateCount,
  field?: (date: Date) => number
): CountableTimeInterval;
export function timeInterval(
  floor: DateMutation,
  offset: DateOffset,
  count?: DateCount,
  field?: (date: Date) => number
): TimeInterval {
  function interval(value?: DateValue): Date {
    const date = arguments.length === 0 ? new Date() : new Date(+value!);
    floor(date);
    return date;
  }
  interval.floor = (value: DateValue): Date => {
    const date = new Date(+value);
    floor(date);
    return date;
  };
  interval.ceil = (value: DateValue): Date => {
    const date = new Date(+value - 1);
    floor(date);
    offset(date, 1);
    floor(date);
    return date;
  };
  interval.round = (value: DateValue): Date => {
    const before = interval(value);
    const after = interval.ceil(value);
    return +value - +before < +after - +value ? before : after;
  };
  interval.offset = (value: DateValue, step?: number): Date => {
    const date = new Date(+value);
    offset(date, step == null ? 1 : Math.floor(step));
    return date;
  };
  interval.range = (
    start: DateValue,
    stop: DateValue,
    step?: number
  ): Date[] => {
    const range: Date[] = [];
    const date = interval.ceil(start);
    const stride = step == null ? 1 : Math.floor(step);
    if (!(+date < +stop) || !(stride > 0)) return range;
    let previous: Date;
    do {
      previous = new Date(+date);
      range.push(previous);
      offset(date, stride);
      floor(date);
    } while (+previous < +date && +date < +stop);
    return range;
  };
  interval.filter = (test: (date: Date) => boolean): TimeInterval =>
    timeInterval(
      date => {
        if (!Number.isNaN(+date)) {
          floor(date);
          while (!test(date)) {
            date.setTime(+date - 1);
            floor(date);
          }
        }
      },
      (date, step) => {
        if (!Number.isNaN(+date)) {
          const direction = step < 0 ? -1 : 1;
          for (let remaining = Math.abs(step); remaining > 0; --remaining) {
            do {
              offset(date, direction);
            } while (!test(date));
          }
        }
      }
    );
  if (count) {
    interval.count = (start: DateValue, end: DateValue): number => {
      countStart.setTime(+start);
      countEnd.setTime(+end);
      floor(countStart);
      floor(countEnd);
      return Math.floor(count(countStart, countEnd));
    };
    interval.every = (step: number): TimeInterval | null => {
      step = Math.floor(step);
      if (!Number.isFinite(step) || !(step > 0)) return null;
      if (step === 1) return interval;
      return interval.filter(
        field
          ? date => field(date) % step === 0
          : date => interval.count!(0, date) % step === 0
      );
    };
  }
  return interval;
}

const countStart = new Date();
const countEnd = new Date();
const durationSecond = 1000;
const durationMinute = durationSecond * 60;
const durationHour = durationMinute * 60;
const durationDay = durationHour * 24;
const durationWeek = durationDay * 7;
const durationMonth = durationDay * 30;
const durationYear = durationDay * 365;

const millisecond = timeInterval(
  () => {
    // noop
  },
  (date, step) => {
    date.setTime(+date + step);
  },
  (start, end) => {
    return +end - +start;
  }
);

// An optimized implementation for this simple case.
millisecond.every = k => {
  k = Math.floor(k);
  if (!isFinite(k) || !(k > 0)) return null;
  if (!(k > 1)) return millisecond;
  return timeInterval(
    date => {
      date.setTime(Math.floor(+date / k) * k);
    },
    (date, step) => {
      date.setTime(+date + step * k);
    },
    (start, end) => {
      return (+end - +start) / k;
    }
  );
};

const second = timeInterval(
  date => {
    date.setTime(+date - date.getMilliseconds());
  },
  (date, step) => {
    date.setTime(+date + step * durationSecond);
  },
  (start, end) => {
    return (+end - +start) / durationSecond;
  },
  date => {
    return date.getUTCSeconds();
  }
);

export const timeMinute = timeInterval(
  date => {
    date.setTime(
      +date - date.getMilliseconds() - date.getSeconds() * durationSecond
    );
  },
  (date, step) => {
    date.setTime(+date + step * durationMinute);
  },
  (start, end) => {
    return (+end - +start) / durationMinute;
  },
  date => {
    return date.getMinutes();
  }
);

export const utcMinute = timeInterval(
  date => {
    date.setUTCSeconds(0, 0);
  },
  (date, step) => {
    date.setTime(+date + step * durationMinute);
  },
  (start, end) => {
    return (+end - +start) / durationMinute;
  },
  date => {
    return date.getUTCMinutes();
  }
);

export const timeHour = timeInterval(
  date => {
    date.setTime(
      +date -
        date.getMilliseconds() -
        date.getSeconds() * durationSecond -
        date.getMinutes() * durationMinute
    );
  },
  (date, step) => {
    date.setTime(+date + step * durationHour);
  },
  (start, end) => {
    return (+end - +start) / durationHour;
  },
  date => {
    return date.getHours();
  }
);

export const utcHour = timeInterval(
  date => {
    date.setUTCMinutes(0, 0, 0);
  },
  (date, step) => {
    date.setTime(+date + step * durationHour);
  },
  (start, end) => {
    return (+end - +start) / durationHour;
  },
  date => {
    return date.getUTCHours();
  }
);

export const timeDay = timeInterval(
  date => date.setHours(0, 0, 0, 0),
  (date, step) => date.setDate(date.getDate() + step),
  (start, end) =>
    (+end -
      +start -
      (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) /
    durationDay,
  date => date.getDate() - 1
);

export const timeDays = timeDay.range;

export const utcDay = timeInterval(
  date => {
    date.setUTCHours(0, 0, 0, 0);
  },
  (date, step) => {
    date.setUTCDate(date.getUTCDate() + step);
  },
  (start, end) => {
    return (+end - +start) / durationDay;
  },
  date => {
    return date.getUTCDate() - 1;
  }
);

export const utcDays = utcDay.range;

export const unixDay = timeInterval(
  date => {
    date.setUTCHours(0, 0, 0, 0);
  },
  (date, step) => {
    date.setUTCDate(date.getUTCDate() + step);
  },
  (start, end) => {
    return (+end - +start) / durationDay;
  },
  date => {
    return Math.floor(+date / durationDay);
  }
);

export const unixDays = unixDay.range;

function timeWeekday(i: number) {
  return timeInterval(
    date => {
      date.setDate(date.getDate() - ((date.getDay() + 7 - i) % 7));
      date.setHours(0, 0, 0, 0);
    },
    (date, step) => {
      date.setDate(date.getDate() + step * 7);
    },
    (start, end) => {
      return (
        (+end -
          +start -
          (end.getTimezoneOffset() - start.getTimezoneOffset()) *
            durationMinute) /
        durationWeek
      );
    }
  );
}

export const timeSunday = timeWeekday(0);
export const timeMonday = timeWeekday(1);
export const timeTuesday = timeWeekday(2);
export const timeWednesday = timeWeekday(3);
export const timeThursday = timeWeekday(4);
export const timeFriday = timeWeekday(5);
export const timeSaturday = timeWeekday(6);

export const timeSundays = timeSunday.range;
export const timeMondays = timeMonday.range;
export const timeTuesdays = timeTuesday.range;
export const timeWednesdays = timeWednesday.range;
export const timeThursdays = timeThursday.range;
export const timeFridays = timeFriday.range;
export const timeSaturdays = timeSaturday.range;

function utcWeekday(i: number) {
  return timeInterval(
    date => {
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 7 - i) % 7));
      date.setUTCHours(0, 0, 0, 0);
    },
    (date, step) => {
      date.setUTCDate(date.getUTCDate() + step * 7);
    },
    (start, end) => {
      return (+end - +start) / durationWeek;
    }
  );
}

export const utcSunday = utcWeekday(0);
export const utcMonday = utcWeekday(1);
export const utcTuesday = utcWeekday(2);
export const utcWednesday = utcWeekday(3);
export const utcThursday = utcWeekday(4);
export const utcFriday = utcWeekday(5);
export const utcSaturday = utcWeekday(6);

export const utcSundays = utcSunday.range;
export const utcMondays = utcMonday.range;
export const utcTuesdays = utcTuesday.range;
export const utcWednesdays = utcWednesday.range;
export const utcThursdays = utcThursday.range;
export const utcFridays = utcFriday.range;
export const utcSaturdays = utcSaturday.range;

export const timeMonth = timeInterval(
  date => {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
  },
  (date, step) => {
    date.setMonth(date.getMonth() + step);
  },
  (start, end) => {
    return (
      end.getMonth() -
      start.getMonth() +
      (end.getFullYear() - start.getFullYear()) * 12
    );
  },
  date => {
    return date.getMonth();
  }
);

export const timeMonths = timeMonth.range;

export const utcMonth = timeInterval(
  date => {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
  },
  (date, step) => {
    date.setUTCMonth(date.getUTCMonth() + step);
  },
  (start, end) => {
    return (
      end.getUTCMonth() -
      start.getUTCMonth() +
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12
    );
  },
  date => {
    return date.getUTCMonth();
  }
);

export const utcMonths = utcMonth.range;

export const timeYear = timeInterval(
  date => {
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  },
  (date, step) => {
    date.setFullYear(date.getFullYear() + step);
  },
  (start, end) => {
    return end.getFullYear() - start.getFullYear();
  },
  date => {
    return date.getFullYear();
  }
);

// An optimized implementation for this simple case.
timeYear.every = k => {
  return !isFinite((k = Math.floor(k))) || !(k > 0)
    ? null
    : timeInterval(
        date => {
          date.setFullYear(Math.floor(date.getFullYear() / k) * k);
          date.setMonth(0, 1);
          date.setHours(0, 0, 0, 0);
        },
        (date, step) => {
          date.setFullYear(date.getFullYear() + step * k);
        }
      );
};

export const utcYear = timeInterval(
  date => {
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  },
  (date, step) => {
    date.setUTCFullYear(date.getUTCFullYear() + step);
  },
  (start, end) => {
    return end.getUTCFullYear() - start.getUTCFullYear();
  },
  date => {
    return date.getUTCFullYear();
  }
);

// An optimized implementation for this simple case.
utcYear.every = k => {
  return !isFinite((k = Math.floor(k))) || !(k > 0)
    ? null
    : timeInterval(
        date => {
          date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
          date.setUTCMonth(0, 1);
          date.setUTCHours(0, 0, 0, 0);
        },
        (date, step) => {
          date.setUTCFullYear(date.getUTCFullYear() + step * k);
        }
      );
};

const e10 = Math.sqrt(50),
  e5 = Math.sqrt(10),
  e2 = Math.sqrt(2);

function tickSpec(
  start: number,
  stop: number,
  count: number
): [number, number, number] {
  const step = (stop - start) / Math.max(0, count),
    power = Math.floor(Math.log10(step)),
    error = step / Math.pow(10, power),
    factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
  let i1, i2, inc;
  if (power < 0) {
    inc = Math.pow(10, -power) / factor;
    i1 = Math.round(start * inc);
    i2 = Math.round(stop * inc);
    if (i1 / inc < start) ++i1;
    if (i2 / inc > stop) --i2;
    inc = -inc;
  } else {
    inc = Math.pow(10, power) * factor;
    i1 = Math.round(start / inc);
    i2 = Math.round(stop / inc);
    if (i1 * inc < start) ++i1;
    if (i2 * inc > stop) --i2;
  }
  if (i2 < i1 && 0.5 <= count && count < 2)
    return tickSpec(start, stop, count * 2);
  return [i1, i2, inc];
}

function tickIncrement(start: number, stop: number, count: number): number {
  return tickSpec(start, stop, count)[2];
}

function tickStep(start: number, stop: number, count: number): number {
  const reverse = stop < start,
    inc = reverse
      ? tickIncrement(stop, start, count)
      : tickIncrement(start, stop, count);
  return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
}

function ticker(
  year: CountableTimeInterval,
  month: CountableTimeInterval,
  week: CountableTimeInterval,
  day: CountableTimeInterval,
  hour: CountableTimeInterval,
  minute: CountableTimeInterval
) {
  const tickIntervals: [CountableTimeInterval, number, number][] = [
    [second, 1, durationSecond],
    [second, 5, 5 * durationSecond],
    [second, 15, 15 * durationSecond],
    [second, 30, 30 * durationSecond],
    [minute, 1, durationMinute],
    [minute, 5, 5 * durationMinute],
    [minute, 15, 15 * durationMinute],
    [minute, 30, 30 * durationMinute],
    [hour, 1, durationHour],
    [hour, 3, 3 * durationHour],
    [hour, 6, 6 * durationHour],
    [hour, 12, 12 * durationHour],
    [day, 1, durationDay],
    [day, 2, 2 * durationDay],
    [week, 1, durationWeek],
    [month, 1, durationMonth],
    [month, 3, 3 * durationMonth],
    [year, 1, durationYear],
  ];

  function ticks(
    start: DateValue,
    stop: DateValue,
    count: number | TimeInterval
  ): Date[] {
    const reverse = +stop < +start;
    if (reverse) [start, stop] = [stop, start];
    const interval =
      typeof count !== 'number' ? count : tickInterval(start, stop, count);
    const ticks = interval ? interval.range(start, +stop + 1) : []; // inclusive stop
    return reverse ? ticks.reverse() : ticks;
  }

  function tickInterval(
    start: DateValue,
    stop: DateValue,
    count: number
  ): TimeInterval | null {
    const target = Math.abs(+stop - +start) / count;
    let low = 0;
    let high = tickIntervals.length;
    if (Number.isNaN(target)) low = high;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (tickIntervals[middle][2] <= target) low = middle + 1;
      else high = middle;
    }
    const i = low;
    if (i === tickIntervals.length)
      return year.every(
        tickStep(+start / durationYear, +stop / durationYear, count)
      );
    if (i === 0)
      return millisecond.every(Math.max(tickStep(+start, +stop, count), 1));
    const [t, step] =
      tickIntervals[
        target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target
          ? i - 1
          : i
      ];
    return t.every(step);
  }

  return [ticks, tickInterval] as const;
}

const [utcTicks] = ticker(
  utcYear,
  utcMonth,
  utcSunday,
  unixDay,
  utcHour,
  utcMinute
);
const [timeTicks] = ticker(
  timeYear,
  timeMonth,
  timeSunday,
  timeDay,
  timeHour,
  timeMinute
);

export { utcTicks, timeTicks };
export {
  millisecond as timeMillisecond,
  millisecond as utcMillisecond,
  second as timeSecond,
  second as utcSecond,
  timeSunday as timeWeek,
  utcSunday as utcWeek,
};
