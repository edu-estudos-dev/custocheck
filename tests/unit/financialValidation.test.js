import { describe, expect, it } from 'vitest';
import {
  isIsoDate,
  isValidDateRange,
  parseFiniteDecimal,
  parseNonNegativeDecimal,
  parsePositiveDecimal,
} from '../../src/utilities/validation.js';

describe('financial validation', () => {
  it('parses a precise positive decimal literal without rounding it', () => {
    expect(parsePositiveDecimal('0.035')).toBe(0.035);
  });

  it('rejects zero where a positive decimal is required', () => {
    expect(() => parsePositiveDecimal(0)).toThrow();
  });

  it('rejects decimal text with trailing non-numeric characters', () => {
    expect(() => parseFiniteDecimal('12abc')).toThrow();
  });

  it('rejects infinite numeric values', () => {
    expect(() => parseFiniteDecimal(Infinity)).toThrow();
  });

  it('accepts zero where a non-negative decimal is required', () => {
    expect(parseNonNegativeDecimal(0)).toBe(0);
  });

  it('rejects impossible ISO calendar dates', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
  });

  it('accepts leap-day dates in leap years', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('rejects a date range whose end precedes its start', () => {
    expect(isValidDateRange('2026-09-02', '2026-09-01')).toBe(false);
  });
});
