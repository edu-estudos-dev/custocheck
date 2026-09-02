import pool from '../config/database.js';

export const createLoja = async (contaId, nome, cidade = null) => {
  const result = await pool.query(
    `INSERT INTO lojas (conta_id, nome, cidade)
     VALUES ($1, $2, $3)
     RETURNING id, conta_id, nome, cidade, ativo, criado_em`,
    [contaId, nome, cidade]
  );
  return result.rows[0];
};

export const getLojaById = async (lojaId, contaId) => {
  const result = await pool.query(
    'SELECT id, conta_id, nome, cidade, ativo, criado_em FROM lojas WHERE id = $1 AND conta_id = $2',
    [lojaId, contaId]
  );
  return result.rows[0];
};

export const listLojasByContaId = async (contaId) => {
  const result = await pool.query(
    `SELECT id, conta_id, nome, cidade, ativo, criado_em
     FROM lojas
     WHERE conta_id = $1 AND ativo = true
     ORDER BY nome ASC`,
    [contaId]
  );
  return result.rows;
};

export const updateLoja = async (lojaId, contaId, updates) => {
  const { nome, cidade, ativo } = updates;
  const result = await pool.query(
    `UPDATE lojas SET nome = COALESCE($1, nome),
                      cidade = COALESCE($2, cidade),
                      ativo = COALESCE($3, ativo)
     WHERE id = $4 AND conta_id = $5
     RETURNING id, conta_id, nome, cidade, ativo, criado_em`,
    [nome || null, cidade || null, ativo !== undefined ? ativo : null, lojaId, contaId]
  );
  return result.rows[0];
};

export const deleteLoja = async (lojaId, contaId) => {
  const result = await pool.query(
    'DELETE FROM lojas WHERE id = $1 AND conta_id = $2 RETURNING id',
    [lojaId, contaId]
  );
  return result.rows[0];
};
