import crypto from 'crypto';
import pool from '../config/database.js';

const TOKEN_TTL_MS = 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const createResetToken = async (usuarioId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiraEm = new Date(Date.now() + TOKEN_TTL_MS);

  // Invalida qualquer token pendente anterior do mesmo usuário: só o link
  // mais recente deve funcionar.
  await pool.query(
    `UPDATE password_reset_tokens SET usado_em = CURRENT_TIMESTAMP
     WHERE usuario_id = $1 AND usado_em IS NULL`,
    [usuarioId]
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (usuario_id, token_hash, expira_em)
     VALUES ($1, $2, $3)`,
    [usuarioId, tokenHash, expiraEm]
  );

  return token;
};

export const consumeResetToken = async (token) => {
  const tokenHash = hashToken(token);

  const result = await pool.query(
    `UPDATE password_reset_tokens
     SET usado_em = CURRENT_TIMESTAMP
     WHERE token_hash = $1
       AND usado_em IS NULL
       AND expira_em > CURRENT_TIMESTAMP
     RETURNING usuario_id`,
    [tokenHash]
  );

  return result.rows[0]?.usuario_id || null;
};

export const isResetTokenValid = async (token) => {
  const tokenHash = hashToken(token);

  const result = await pool.query(
    `SELECT 1 FROM password_reset_tokens
     WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > CURRENT_TIMESTAMP`,
    [tokenHash]
  );

  return result.rowCount > 0;
};
