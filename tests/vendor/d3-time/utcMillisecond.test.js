import { it } from 'vitest';
import assert from 'assert';
import { timeMillisecond, utcMillisecond } from '@/src/core/time-interval';

it('utcMillisecond is an alias for timeMillisecond', () => {
  assert.strictEqual(utcMillisecond, timeMillisecond);
});
