import pool, { withTransaction } from '../config/database.js';

export const createContagem = async (contaId, lojaId, dataReferencia, criadoPor, itens) => {
  return withTransaction(async (client) => {
    const contagemRes = await client.query(
      `INSERT INTO contagens (conta_id, loja_id, data_referencia, status, criado_por)
       VALUES ($1, $2, $3, 'fechada', $4)
       RETURNING id, conta_id, loja_id, data_referencia, status, criado_por, criado_em`,
      [contaId, lojaId, dataReferencia, criadoPor]
    );
    const contagem = contagemRes.rows[0];

    for (const item of itens) {
      await client.query(
        `INSERT INTO contagem_itens (contagem_id, insumo_id, qtd_base) VALUES ($1, $2, $3)`,
        [contagem.id, item.insumoId, item.qtdBase]
      );
    }

    return contagem;
  });
};

export const listContagensByLoja = async (lojaId, contaId) => {
  const result = await pool.query(
    `SELECT id, conta_id, loja_id, data_referencia, status, criado_em
     FROM contagens
     WHERE loja_id = $1 AND conta_id = $2
     ORDER BY data_referencia DESC`,
    [lojaId, contaId]
  );
  return result.rows;
};

export const getContagemComItens = async (contagemId, contaId) => {
  const contagemRes = await pool.query(
    `SELECT id, conta_id, loja_id, data_referencia, status, criado_em
     FROM contagens WHERE id = $1 AND conta_id = $2`,
    [contagemId, contaId]
  );
  const contagem = contagemRes.rows[0];
  if (!contagem) return null;

  const itensRes = await pool.query(
    `SELECT ci.insumo_id, ci.qtd_base, i.nome as insumo_nome, i.unidade_base
     FROM contagem_itens ci
     JOIN insumos i ON i.id = ci.insumo_id
     WHERE ci.contagem_id = $1
     ORDER BY i.nome ASC`,
    [contagemId]
  );

  return { ...contagem, itens: itensRes.rows };
};

// Última contagem da loja com data_referencia <= dataLimite (ou a mais próxima antes dela).
export const getUltimaContagemAte = async (lojaId, contaId, dataLimite) => {
  const contagemRes = await pool.query(
    `SELECT id, data_referencia FROM contagens
     WHERE loja_id = $1 AND conta_id = $2 AND data_referencia <= $3
     ORDER BY data_referencia DESC LIMIT 1`,
    [lojaId, contaId, dataLimite]
  );
  const contagem = contagemRes.rows[0];
  if (!contagem) return null;

  const itensRes = await pool.query(
    `SELECT insumo_id, qtd_base FROM contagem_itens WHERE contagem_id = $1`,
    [contagem.id]
  );

  return { ...contagem, itens: itensRes.rows };
};
