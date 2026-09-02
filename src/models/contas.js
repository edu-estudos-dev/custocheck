import pool from '../config/database.js';

export const createConta = async (nome, email, plano = 'basic') => {
  const result = await pool.query(
    `INSERT INTO contas (nome, email, plano)
     VALUES ($1, $2, $3)
     RETURNING id, nome, email, plano, criado_em`,
    [nome, email, plano]
  );
  return result.rows[0];
};

export const getContaById = async (contaId) => {
  const result = await pool.query(
    'SELECT id, nome, email, plano, criado_em FROM contas WHERE id = $1',
    [contaId]
  );
  return result.rows[0];
};

export const getContaByEmail = async (email) => {
  const result = await pool.query(
    'SELECT id, nome, email, plano, criado_em FROM contas WHERE email = $1',
    [email]
  );
  return result.rows[0];
};
