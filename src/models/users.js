import pool from '../config/database.js';
import bcrypt from 'bcrypt';

export const createUser = async (contaId, nome, email, senha, papel = 'operador') => {
  const senhaHash = await bcrypt.hash(senha, 10);
  const result = await pool.query(
    `INSERT INTO usuarios (conta_id, nome, email, senha_hash, papel)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, conta_id, nome, email, papel, ativo, criado_em`,
    [contaId, nome, email, senhaHash, papel]
  );
  return result.rows[0];
};

export const getUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT id, conta_id, nome, email, senha_hash, papel, ativo FROM usuarios WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

export const getUserById = async (userId, contaId = null) => {
  const query = contaId
    ? 'SELECT id, conta_id, nome, email, papel, ativo FROM usuarios WHERE id = $1 AND conta_id = $2'
    : 'SELECT id, conta_id, nome, email, papel, ativo FROM usuarios WHERE id = $1';

  const params = contaId ? [userId, contaId] : [userId];
  const result = await pool.query(query, params);
  return result.rows[0];
};

export const verifyPassword = async (plainPassword, hashPassword) => {
  return bcrypt.compare(plainPassword, hashPassword);
};

export const listUsersByContaId = async (contaId) => {
  const result = await pool.query(
    `SELECT id, conta_id, nome, email, papel, ativo, criado_em
     FROM usuarios
     WHERE conta_id = $1
     ORDER BY criado_em DESC`,
    [contaId]
  );
  return result.rows;
};
