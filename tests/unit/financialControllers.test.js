import { beforeEach, describe, expect, it, vi } from 'vitest';

const compraModel = {
  createCompra: vi.fn(),
};
const vendaModel = {
  createVendaPeriodo: vi.fn(),
  updateVendaPeriodo: vi.fn(),
};
const lojaModel = {
  getLojaById: vi.fn(),
};
const insumoModel = {
  getEmbalagemById: vi.fn(),
  getInsumoById: vi.fn(),
  listInsumosByContaId: vi.fn(),
  createEmbalagem: vi.fn(),
};
const contagemModel = {
  createContagem: vi.fn(),
};
const costService = {
  calculateResultadoPeriodo: vi.fn(),
};

vi.mock('../../src/models/compras.js', () => compraModel);
vi.mock('../../src/models/vendas.js', () => vendaModel);
vi.mock('../../src/models/lojas.js', () => lojaModel);
vi.mock('../../src/models/insumos.js', () => insumoModel);
vi.mock('../../src/models/contagens.js', () => contagemModel);
vi.mock('../../src/services/costCalculation.js', () => costService);

const { createCompra } = await import('../../src/controllers/compras.js');
const { createVenda } = await import('../../src/controllers/vendas.js');
const { getResultadoPeriodo } = await import('../../src/controllers/resultado.js');
const { createContagem } = await import('../../src/controllers/contagens.js');
const { createEmbalagem } = await import('../../src/controllers/insumos.js');

const contaSession = { contaId: 1, userId: 2 };
const embalagem = {
  id: 31,
  conta_id: 1,
  insumo_id: 12,
  descricao: 'Saco de 1 kg',
  fator_conversao: 1000,
  criado_em: '2026-09-01T00:00:00.000Z',
};

const response = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('financial controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lojaModel.getLojaById.mockResolvedValue({ id: 11 });
    insumoModel.getInsumoById.mockResolvedValue({ id: 12 });
    insumoModel.getEmbalagemById.mockResolvedValue(embalagem);
    compraModel.createCompra.mockResolvedValue({ id: 1 });
    vendaModel.createVendaPeriodo.mockResolvedValue({ id: 2 });
    contagemModel.createContagem.mockResolvedValue({ id: 3 });
    insumoModel.listInsumosByContaId.mockResolvedValue([{ id: 12 }]);
    insumoModel.createEmbalagem.mockResolvedValue({ id: 4 });
  });

  it('rejects a purchase package belonging to a different supply', async () => {
    insumoModel.getEmbalagemById.mockResolvedValue({ ...embalagem, insumo_id: 99 });
    const res = response();

    await createCompra({
      session: contaSession,
      body: {
        lojaId: 11,
        insumoId: 12,
        embalagemId: 31,
        qtdEmbalagens: '2',
        valorTotal: '15.50',
        dataCompra: '2026-09-01',
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each([
    ['a non-positive package quantity', { qtdEmbalagens: '-1' }],
    ['a not-a-number total value', { valorTotal: NaN }],
    ['an infinite total value', { valorTotal: Infinity }],
    ['an invalid purchase date', { dataCompra: '2026-02-29' }],
  ])('rejects a purchase with %s', async (_label, invalidValues) => {
    const res = response();

    await createCompra({
      session: contaSession,
      body: {
        lojaId: 11,
        insumoId: 12,
        embalagemId: 31,
        qtdEmbalagens: '2',
        valorTotal: '15.50',
        dataCompra: '2026-09-01',
        ...invalidValues,
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each(['', false, 0])('rejects an explicitly supplied falsy purchase date: %j', async (dataCompra) => {
    const res = response();

    await createCompra({
      session: contaSession,
      body: {
        lojaId: 11,
        insumoId: 12,
        embalagemId: 31,
        qtdEmbalagens: '2',
        valorTotal: '15.50',
        dataCompra,
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a sale with an invalid period or non-positive revenue', async () => {
    const invalidPeriodResponse = response();
    await createVenda({
      session: contaSession,
      body: { lojaId: 11, dataInicio: '2026-09-02', dataFim: '2026-09-01', faturamento: '100' },
    }, invalidPeriodResponse);

    const invalidRevenueResponse = response();
    await createVenda({
      session: contaSession,
      body: { lojaId: 11, dataInicio: '2026-09-01', dataFim: '2026-09-02', faturamento: 0 },
    }, invalidRevenueResponse);

    expect(invalidPeriodResponse.status).toHaveBeenCalledWith(400);
    expect(invalidRevenueResponse.status).toHaveBeenCalledWith(400);
  });

  it('maps a PostgreSQL duplicate sale error to conflict', async () => {
    vendaModel.createVendaPeriodo.mockRejectedValue({ code: '23505' });
    const res = response();

    await createVenda({
      session: contaSession,
      body: { lojaId: 11, dataInicio: '2026-09-01', dataFim: '2026-09-02', faturamento: '100' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('rejects an inverted result period', async () => {
    const res = response();

    await getResultadoPeriodo({
      session: contaSession,
      query: { lojaId: 11, dataInicio: '2026-09-02', dataFim: '2026-09-01' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a count with an invalid reference date', async () => {
    const res = response();

    await createContagem({
      session: contaSession,
      body: { lojaId: 11, dataReferencia: '2026-02-29', itens: [{ insumoId: 12, qtdBase: '1' }] },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a package with a non-positive conversion factor', async () => {
    const res = response();

    await createEmbalagem({
      session: contaSession,
      params: { id: 12 },
      body: { descricao: 'Saco de 1 kg', fatorConversao: '-1' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
