import { describe, it, expect } from 'vitest';
import { formatWhole } from '@open-loop/engine';
import { formatClock, formatGrouped } from '../useFormatting';

describe('formatGrouped', () => {
  it('writes exact grouped digits, floored, below the switchover', () => {
    expect(formatGrouped(0)).toBe('0');
    expect(formatGrouped(1234.9)).toBe('1,234');
    expect(formatGrouped(999_999)).toBe('999,999');
  });

  it('hands over to the engine notation at the switchover', () => {
    expect(formatGrouped(1e6)).toBe(formatWhole(1e6));
    expect(formatGrouped(5000, 1000)).toBe(formatWhole(5000));
  });
});

describe('formatClock', () => {
  it('writes a clock, not a duration', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65.9)).toBe('1:05');
    expect(formatClock(3599)).toBe('59:59');
  });

  it('adds hours from the first hour', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3725)).toBe('1:02:05');
  });
});
