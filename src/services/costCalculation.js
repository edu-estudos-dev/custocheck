import pool from '../config/database.js';
import { roundMoney } from '../utilities/money.js';

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

  const result = await pool.query(query, params);
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
  const vendaResult = await pool.query(
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

  const compraResult = await pool.query(
    `SELECT SUM(valor_total) as custo_total
     FROM compras
     WHERE conta_id = $1 AND loja_id = $2
       AND data_compra >= $3 AND data_compra <= $4`,
    [contaId, lojaId, dataInicio, dataFim]
  );

  const custoTotal = parseFloat(compraResult.rows[0]?.custo_total) || 0;

  return roundMoney((custoTotal / faturamentoTotal) * 100);
};
