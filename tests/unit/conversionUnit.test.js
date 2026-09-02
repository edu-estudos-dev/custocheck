import { describe, it, expect } from 'vitest';
import { convertToBaseUnit } from '../../src/services/conversionUnit.js';

describe('conversionUnit', () => {
  describe('convertToBaseUnit', () => {
    it('converts 10kg box to grams', () => {
      const resultado = convertToBaseUnit(1, 10000);
      expect(resultado).toBe(10000);
    });

    it('converts 3.6kg bucket to grams', () => {
      const resultado = convertToBaseUnit(1, 3600);
      expect(resultado).toBe(3600);
    });

    it('converts 10 boxes (10kg each) to grams', () => {
      const resultado = convertToBaseUnit(10, 10000);
      expect(resultado).toBe(100000);
    });

    it('converts 2.5 buckets (3.6kg each) to grams', () => {
      const resultado = convertToBaseUnit(2.5, 3600);
      expect(resultado).toBe(9000);
    });

    it('throws on missing factor', () => {
      expect(() => convertToBaseUnit(1, null)).toThrow('Fator de conversão não definido');
    });

    it('handles decimal factors', () => {
      const resultado = convertToBaseUnit(1, 2.5);
      expect(resultado).toBe(2.5);
    });
  });
});
