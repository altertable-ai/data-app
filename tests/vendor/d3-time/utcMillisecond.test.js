import { it } from 'vitest';
import assert from 'assert';
import {
  timeMillisecond,
  utcMillisecond,
} from '@/packages/data-app-react/src/ui/time-interval.ts';

it('utcMillisecond is an alias for timeMillisecond', () => {
  assert.strictEqual(utcMillisecond, timeMillisecond);
});
