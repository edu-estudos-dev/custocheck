import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../../src/config/database.js', () => ({
  default: { query: (...args) => queryMock(...args) },
}));

const { calculateCMVPercent, calculateWeightedAverageCost } = await import(
  '../../src/services/costCalculation.js'
);

describe('costCalculation', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  describe('calculateCMVPercent', () => {
    it('divide custo total das compras pelo faturamento do período', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ faturamento_total: '1000.00' }] })
        .mockResolvedValueOnce({ rows: [{ custo_total: '350.00' }] });

      const resultado = await calculateCMVPercent(1, 1, '2026-08-01', '2026-08-31');

      expect(resultado).toBe(35);
    });

    it('retorna 0 sem lançar quando não há faturamento no período', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ faturamento_total: null }] });

      const resultado = await calculateCMVPercent(1, 1, '2026-08-01', '2026-08-31');

      expect(resultado).toBe(0);
      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it('retorna 0 quando há faturamento mas nenhuma compra no período', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ faturamento_total: '500.00' }] })
        .mockResolvedValueOnce({ rows: [{ custo_total: null }] });

      const resultado = await calculateCMVPercent(1, 1, '2026-08-01', '2026-08-31');

      expect(resultado).toBe(0);
    });
  });

  describe('calculateWeightedAverageCost', () => {
    it('retorna custo médio ponderado calculado pela query', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{ qtd_base_total: '10000', valor_total: '350.00', custo_medio: '0.035' }],
      });

      const resultado = await calculateWeightedAverageCost(1, 1);

      expect(resultado).toEqual({ qtdBaseTotal: 10000, valorTotal: 350, custoMedio: 0.04 });
    });

    it('retorna zeros quando não há compras no período', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ qtd_base_total: null }] });

      const resultado = await calculateWeightedAverageCost(1, 1);

      expect(resultado).toEqual({ qtdBaseTotal: 0, valorTotal: 0, custoMedio: 0 });
    });
  });
});
