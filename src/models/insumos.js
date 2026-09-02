import pool from '../config/database.js';

export const createInsumo = async (contaId, nome, unidadeBase = 'g') => {
  const result = await pool.query(
    `INSERT INTO insumos (conta_id, nome, unidade_base)
     VALUES ($1, $2, $3)
     RETURNING id, conta_id, nome, unidade_base, ativo, criado_em`,
    [contaId, nome, unidadeBase]
  );
  return result.rows[0];
};

export const getInsumoById = async (insumoId, contaId) => {
  const result = await pool.query(
    'SELECT id, conta_id, nome, unidade_base, ativo, criado_em FROM insumos WHERE id = $1 AND conta_id = $2',
    [insumoId, contaId]
  );
  return result.rows[0];
};

export const listInsumosByContaId = async (contaId) => {
  const result = await pool.query(
    `SELECT id, conta_id, nome, unidade_base, ativo, criado_em
     FROM insumos
     WHERE conta_id = $1 AND ativo = true
     ORDER BY nome ASC`,
    [contaId]
  );
  return result.rows;
};

export const updateInsumo = async (insumoId, contaId, updates) => {
  const { nome, unidadeBase, ativo } = updates;
  const result = await pool.query(
    `UPDATE insumos SET nome = COALESCE($1, nome),
                        unidade_base = COALESCE($2, unidade_base),
                        ativo = COALESCE($3, ativo)
     WHERE id = $4 AND conta_id = $5
     RETURNING id, conta_id, nome, unidade_base, ativo, criado_em`,
    [nome || null, unidadeBase || null, ativo !== undefined ? ativo : null, insumoId, contaId]
  );
  return result.rows[0];
};

export const createEmbalagem = async (insumoId, descricao, fatorConversao) => {
  const result = await pool.query(
    `INSERT INTO insumo_embalagens (insumo_id, descricao, fator_conversao)
     VALUES ($1, $2, $3)
     RETURNING id, insumo_id, descricao, fator_conversao, criado_em`,
    [insumoId, descricao, fatorConversao]
  );
  return result.rows[0];
};

export const getEmbalagensByInsumoId = async (insumoId) => {
  const result = await pool.query(
    `SELECT id, insumo_id, descricao, fator_conversao, criado_em
     FROM insumo_embalagens
     WHERE insumo_id = $1
     ORDER BY criado_em DESC`,
    [insumoId]
  );
  return result.rows;
};

export const getEmbalagemById = async (embalagemId) => {
  const result = await pool.query(
    'SELECT id, insumo_id, descricao, fator_conversao, criado_em FROM insumo_embalagens WHERE id = $1',
    [embalagemId]
  );
  return result.rows[0];
};
