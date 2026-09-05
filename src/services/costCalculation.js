import { tenantQuery } from '../config/database.js';
import { roundMoney } from '../utilities/money.js';
import * as contagemModel from '../models/contagens.js';

export const calculateWeightedAverageCost = async (contaId, insumoId, dataInicio = null, dataFim = null) => {
  let query = `
    SELECT
      SUM(c.qtd_embalagens * COALESCE(ie.fator_conversao, 1)) as qtd_base_total,
      SUM(c.valor_total) as valor_total,
      SUM(c.valor_total) / NULLIF(SUM(c.qtd_embalagens * COALESCE(ie.fator_conversao, 1)), 0) as custo_medio
    FROM compras c
    LEFT JOIN insumo_embalagens ie ON c.embalagem_id = ie.id
    WHERE c.conta_id = $1 AND c.insumo_id = $2
  `;

  const params = [contaId, insumoId];

  if (dataInicio) {
    params.push(dataInicio);
    query += ` AND c.data_compra >= $${params.length}`;
  }

  if (dataFim) {
    params.push(dataFim);
    query += ` AND c.data_compra <= $${params.length}`;
  }

  const result = await tenantQuery(contaId, query, params);
  const row = result.rows[0];

  if (!row || !row.qtd_base_total) {
    return {
      qtdBaseTotal: 0,
      valorTotal: 0,
      custoMedio: 0,
    };
  }

  return {
    qtdBaseTotal: roundMoney(parseFloat(row.qtd_base_total)),
    valorTotal: roundMoney(parseFloat(row.valor_total)),
    custoMedio: roundMoney(parseFloat(row.custo_medio)),
  };
};

export const calculateCMVPercent = async (contaId, lojaId, dataInicio, dataFim) => {
  const vendaResult = await tenantQuery(
    contaId,
    `SELECT SUM(faturamento) as faturamento_total
     FROM vendas_periodo
     WHERE conta_id = $1 AND loja_id = $2
       AND data_inicio >= $3 AND data_fim <= $4`,
    [contaId, lojaId, dataInicio, dataFim]
  );

  const faturamentoTotal = parseFloat(vendaResult.rows[0]?.faturamento_total) || 0;
  if (faturamentoTotal === 0) {
    return 0;
  }

  const compraResult = await tenantQuery(
    contaId,
    `SELECT SUM(valor_total) as custo_total
     FROM compras
     WHERE conta_id = $1 AND loja_id = $2
       AND data_compra >= $3 AND data_compra <= $4`,
    [contaId, lojaId, dataInicio, dataFim]
  );

  const custoTotal = parseFloat(compraResult.rows[0]?.custo_total) || 0;

  return roundMoney((custoTotal / faturamentoTotal) * 100);
};

const calcularValorEstoque = async (contaId, contagem) => {
  let valor = 0;
  for (const item of contagem.itens) {
    const { custoMedio } = await calculateWeightedAverageCost(
      contaId,
      item.insumo_id,
      null,
      contagem.data_referencia
    );
    valor += parseFloat(item.qtd_base) * custoMedio;
  }
  return roundMoney(valor);
};

// Resultado do período: usa contagem física (estoque inicial/final) quando
// disponível pra chegar no CMV contábil real (Estoque Inicial + Compras -
// Estoque Final). Sem contagem cadastrada, cai pro CMV aproximado
// (compras / faturamento) e sinaliza que o resultado não é preciso.
export const calculateResultadoPeriodo = async (contaId, lojaId, dataInicio, dataFim) => {
  const [vendaResult, compraResult, contagemInicial, contagemFinal] = await Promise.all([
    tenantQuery(
      contaId,
      `SELECT SUM(faturamento) as faturamento_total
       FROM vendas_periodo
       WHERE conta_id = $1 AND loja_id = $2 AND data_inicio >= $3 AND data_fim <= $4`,
      [contaId, lojaId, dataInicio, dataFim]
    ),
    tenantQuery(
      contaId,
      `SELECT SUM(valor_total) as custo_total
       FROM compras
       WHERE conta_id = $1 AND loja_id = $2 AND data_compra >= $3 AND data_compra <= $4`,
      [contaId, lojaId, dataInicio, dataFim]
    ),
    contagemModel.getUltimaContagemAte(lojaId, contaId, dataInicio),
    contagemModel.getUltimaContagemAte(lojaId, contaId, dataFim),
  ]);

  const faturamento = roundMoney(parseFloat(vendaResult.rows[0]?.faturamento_total) || 0);
  const comprasPeriodo = roundMoney(parseFloat(compraResult.rows[0]?.custo_total) || 0);

  const contagemCompleta = Boolean(contagemInicial && contagemFinal);

  if (!contagemCompleta) {
    const cmvPercentAproximado = faturamento > 0 ? roundMoney((comprasPeriodo / faturamento) * 100) : 0;
    return {
      contagemCompleta: false,
      faturamento,
      comprasPeriodo,
      estoqueInicial: null,
      estoqueFinal: null,
      cmvReais: null,
      cmvPercent: cmvPercentAproximado,
    };
  }

  const [estoqueInicial, estoqueFinal] = await Promise.all([
    calcularValorEstoque(contaId, contagemInicial),
    calcularValorEstoque(contaId, contagemFinal),
  ]);

  const cmvReais = roundMoney(estoqueInicial + comprasPeriodo - estoqueFinal);
  const cmvPercent = faturamento > 0 ? roundMoney((cmvReais / faturamento) * 100) : 0;

  return {
    contagemCompleta: true,
    faturamento,
    comprasPeriodo,
    estoqueInicial,
    estoqueFinal,
    cmvReais,
    cmvPercent,
  };
};
