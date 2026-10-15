import { it } from 'vitest';
import assert from 'assert';
import {
  timeMillisecond,
  utcMillisecond,
} from '@/packages/data-app/src/core/time-interval.ts';

it('utcMillisecond is an alias for timeMillisecond', () => {
  assert.strictEqual(utcMillisecond, timeMillisecond);
});
