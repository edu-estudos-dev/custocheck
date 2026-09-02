import pool from '../config/database.js';

export const createVendaPeriodo = async (contaId, lojaId, dataInicio, dataFim, faturamento) => {
  const result = await pool.query(
    `INSERT INTO vendas_periodo (conta_id, loja_id, data_inicio, data_fim, faturamento)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING id, conta_id, loja_id, data_inicio, data_fim, faturamento, criado_em`,
    [contaId, lojaId, dataInicio, dataFim, faturamento]
  );
  return result.rows[0];
};

export const getVendaPeriodo = async (lojaId, contaId, dataInicio, dataFim) => {
  const result = await pool.query(
    `SELECT id, conta_id, loja_id, data_inicio, data_fim, faturamento, criado_em
     FROM vendas_periodo
     WHERE conta_id = $1 AND loja_id = $2 AND data_inicio = $3 AND data_fim = $4`,
    [contaId, lojaId, dataInicio, dataFim]
  );
  return result.rows[0];
};

export const listVendasByLojaId = async (lojaId, contaId) => {
  const result = await pool.query(
    `SELECT id, conta_id, loja_id, data_inicio, data_fim, faturamento, criado_em
     FROM vendas_periodo
     WHERE conta_id = $1 AND loja_id = $2
     ORDER BY data_inicio DESC`,
    [contaId, lojaId]
  );
  return result.rows;
};

export const updateVendaPeriodo = async (vendaId, contaId, updates) => {
  const { faturamento } = updates;
  const result = await pool.query(
    `UPDATE vendas_periodo SET faturamento = COALESCE($1, faturamento)
     WHERE id = $2 AND conta_id = $3
     RETURNING id, conta_id, loja_id, data_inicio, data_fim, faturamento, criado_em`,
    [faturamento || null, vendaId, contaId]
  );
  return result.rows[0];
};
