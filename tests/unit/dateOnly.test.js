import { describe, expect, it } from 'vitest';
import { formatDateOnly } from '../../public/js/date-only.js';

describe('formatDateOnly', () => {
  it('formats date-only values without timezone shifts', () => {
    expect(formatDateOnly('2026-09-01')).toBe('01/09/2026');
    expect(formatDateOnly('2026-09-01T00:00:00.000Z')).toBe('01/09/2026');
    expect(formatDateOnly('')).toBe('');
    expect(formatDateOnly('not-a-date')).toBe('');
    expect(formatDateOnly('2026-13-40')).toBe('');
    expect(formatDateOnly('2026-02-29')).toBe('');
    expect(formatDateOnly('2028-02-29')).toBe('29/02/2028');
  });
});
