import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const queryMock = vi.fn();
vi.mock('../../src/config/database.js', () => ({
  default: { query: (...args) => queryMock(...args) },
}));

const { createResetToken, consumeResetToken, isResetTokenValid } = await import(
  '../../src/models/passwordReset.js'
);

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

describe('passwordReset', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('createResetToken grava o hash do token, não o valor cru', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const token = await createResetToken(42);

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO password_reset_tokens/);
    expect(params[0]).toBe(42);
    expect(params[1]).toBe(hash(token));
    expect(params[1]).not.toBe(token);
  });

  it('consumeResetToken retorna o usuario_id quando o token é válido e não usado', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ usuario_id: 7 }] });

    const usuarioId = await consumeResetToken('token-de-teste');

    expect(usuarioId).toBe(7);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/usado_em IS NULL/);
    expect(sql).toMatch(/expira_em > CURRENT_TIMESTAMP/);
    expect(params[0]).toBe(hash('token-de-teste'));
  });

  it('consumeResetToken retorna null pra token expirado ou já usado', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const usuarioId = await consumeResetToken('token-invalido');

    expect(usuarioId).toBeNull();
  });

  it('isResetTokenValid reflete se existe linha válida', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    expect(await isResetTokenValid('t')).toBe(true);

    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    expect(await isResetTokenValid('t')).toBe(false);
  });
});
