import pool from '../config/database.js';

export const createCompra = async (
  contaId,
  lojaId,
  insumoId,
  embalagemId,
  qtdEmbalagens,
  valorTotal,
  fornecedor = null,
  dataCompra = null
) => {
  const result = await pool.query(
    `INSERT INTO compras (conta_id, loja_id, insumo_id, embalagem_id, qtd_embalagens, valor_total, fornecedor, data_compra)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE))
     RETURNING id, conta_id, loja_id, insumo_id, embalagem_id, qtd_embalagens, valor_total, fornecedor, data_compra, criado_em`,
    [contaId, lojaId, insumoId, embalagemId, qtdEmbalagens, valorTotal, fornecedor, dataCompra]
  );
  return result.rows[0];
};

export const getCompraById = async (compraId, contaId) => {
  const result = await pool.query(
    `SELECT id, conta_id, loja_id, insumo_id, embalagem_id, qtd_embalagens, valor_total, fornecedor, data_compra, criado_em
     FROM compras
     WHERE id = $1 AND conta_id = $2`,
    [compraId, contaId]
  );
  return result.rows[0];
};

export const listComprasByLojaId = async (lojaId, contaId, dataInicio = null, dataFim = null) => {
  let query = `
    SELECT c.id, c.conta_id, c.loja_id, c.insumo_id, c.embalagem_id,
           c.qtd_embalagens, c.valor_total, c.fornecedor, c.data_compra, c.criado_em,
           i.nome as insumo_nome, ie.descricao as embalagem_descricao
    FROM compras c
    JOIN insumos i ON c.insumo_id = i.id
    LEFT JOIN insumo_embalagens ie ON c.embalagem_id = ie.id
    WHERE c.conta_id = $1 AND c.loja_id = $2
  `;

  const params = [contaId, lojaId];

  if (dataInicio) {
    params.push(dataInicio);
    query += ` AND c.data_compra >= $${params.length}`;
  }

  if (dataFim) {
    params.push(dataFim);
    query += ` AND c.data_compra <= $${params.length}`;
  }

  query += ' ORDER BY c.data_compra DESC';

  const result = await pool.query(query, params);
  return result.rows;
};

export const getCustoMedioPonderado = async (contaId, insumoId, dataInicio = null, dataFim = null) => {
  let query = `
    SELECT
      SUM(qtd_embalagens * COALESCE(ie.fator_conversao, 1)) as qtd_base_total,
      SUM(valor_total) as valor_total,
      SUM(valor_total) / NULLIF(SUM(qtd_embalagens * COALESCE(ie.fator_conversao, 1)), 0) as custo_medio_ponderado
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
  return result.rows[0];
};
