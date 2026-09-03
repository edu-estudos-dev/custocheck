import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../../src/config/database.js', () => ({
  default: { query: (...args) => queryMock(...args) },
}));

const getUltimaContagemAteMock = vi.fn();
vi.mock('../../src/models/contagens.js', () => ({
  getUltimaContagemAte: (...args) => getUltimaContagemAteMock(...args),
}));

const { calculateCMVPercent, calculateWeightedAverageCost, calculateResultadoPeriodo } = await import(
  '../../src/services/costCalculation.js'
);

describe('costCalculation', () => {
  beforeEach(() => {
    queryMock.mockReset();
    getUltimaContagemAteMock.mockReset();
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

      expect(resultado).toEqual({ qtdBaseTotal: 10000, valorTotal: 350, custoMedio: 0.035 });
    });

    it('retorna zeros quando não há compras no período', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ qtd_base_total: null }] });

      const resultado = await calculateWeightedAverageCost(1, 1);

      expect(resultado).toEqual({ qtdBaseTotal: 0, valorTotal: 0, custoMedio: 0 });
    });
  });

  describe('calculateResultadoPeriodo', () => {
    it('sem contagem completa, cai pro CMV aproximado (compras/faturamento)', async () => {
      getUltimaContagemAteMock.mockResolvedValueOnce(null); // inicial
      getUltimaContagemAteMock.mockResolvedValueOnce(null); // final
      queryMock.mockImplementation((sql) => {
        if (sql.includes('faturamento_total')) return Promise.resolve({ rows: [{ faturamento_total: '1000.00' }] });
        if (sql.includes('custo_total')) return Promise.resolve({ rows: [{ custo_total: '350.00' }] });
        throw new Error('query inesperada: ' + sql);
      });

      const r = await calculateResultadoPeriodo(1, 1, '2026-08-01', '2026-08-31');

      expect(r).toEqual({
        contagemCompleta: false,
        faturamento: 1000,
        comprasPeriodo: 350,
        estoqueInicial: null,
        estoqueFinal: null,
        cmvReais: null,
        cmvPercent: 35,
      });
    });

    it('com contagem completa, calcula CMV contábil (estoque inicial + compras - estoque final)', async () => {
      getUltimaContagemAteMock.mockResolvedValueOnce({
        id: 10,
        data_referencia: '2026-08-01',
        itens: [{ insumo_id: 2, qtd_base: '1000' }],
      });
      getUltimaContagemAteMock.mockResolvedValueOnce({
        id: 11,
        data_referencia: '2026-08-31',
        itens: [{ insumo_id: 2, qtd_base: '200' }],
      });

      queryMock.mockImplementation((sql) => {
        if (sql.includes('faturamento_total')) return Promise.resolve({ rows: [{ faturamento_total: '1000.00' }] });
        if (sql.includes('SUM(valor_total) as custo_total'))
          return Promise.resolve({ rows: [{ custo_total: '350.00' }] });
        if (sql.includes('custo_medio'))
          return Promise.resolve({
            rows: [{ qtd_base_total: '4000', valor_total: '40.00', custo_medio: '0.01' }],
          });
        throw new Error('query inesperada: ' + sql);
      });

      const r = await calculateResultadoPeriodo(1, 1, '2026-08-01', '2026-08-31');

      // estoqueInicial = 1000 * 0.01 = 10; estoqueFinal = 200 * 0.01 = 2
      // cmvReais = 10 + 350 - 2 = 358; cmvPercent = 358/1000*100 = 35.8
      expect(r.contagemCompleta).toBe(true);
      expect(r.estoqueInicial).toBe(10);
      expect(r.estoqueFinal).toBe(2);
      expect(r.cmvReais).toBe(358);
      expect(r.cmvPercent).toBe(35.8);
    });

    it('mesma contagem nos dois limites nao e completa', async () => {
      const contagem = {
        id: 10,
        data_referencia: '2026-08-01',
        itens: [{ insumo_id: 2, qtd_base: '1000' }],
      };
      getUltimaContagemAteMock.mockResolvedValueOnce(contagem);
      getUltimaContagemAteMock.mockResolvedValueOnce(contagem);
      queryMock.mockImplementation((sql) => {
        if (sql.includes('faturamento_total')) return Promise.resolve({ rows: [{ faturamento_total: '1000.00' }] });
        if (sql.includes('custo_total')) return Promise.resolve({ rows: [{ custo_total: '350.00' }] });
        if (sql.includes('custo_medio')) return Promise.resolve({ rows: [{ qtd_base_total: '1000', valor_total: '10.00', custo_medio: '0.01' }] });
        throw new Error('query inesperada: ' + sql);
      });

      const r = await calculateResultadoPeriodo(1, 1, '2026-08-01', '2026-08-31');

      expect(r.contagemCompleta).toBe(false);
      expect(r.cmvReais).toBeNull();
      expect(r.cmvPercent).toBe(35);
    });
  });
});
