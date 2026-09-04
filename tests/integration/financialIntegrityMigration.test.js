import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { describe, expect, it } from 'vitest';

const { Client } = pg;
const SAFE_SCHEMA_NAME = /^custocheck_block1_[0-9a-f]+$/;
const migrationPath = fileURLToPath(
  new URL('../../migrations/006_financial_integrity.sql', import.meta.url),
);

const expectConstraintViolation = async (client, text, values, constraint) => {
  await expect(client.query(text, values)).rejects.toMatchObject({ constraint });
};

describe('006_financial_integrity.sql', () => {
  it('diagnoses duplicates without data loss and enforces every financial constraint', async () => {
    const schemaName = `custocheck_block1_${randomBytes(8).toString('hex')}`;
    let schemaCreated = false;

    if (!SAFE_SCHEMA_NAME.test(schemaName)) {
      throw new Error(`Refusing to use unsafe test schema: ${schemaName}`);
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : undefined,
      application_name: 'custocheck-financial-integrity-test',
    });

    const runMigration = async () => {
      const migration = await readFile(migrationPath, 'utf8');
      return client.query(migration);
    };

    await client.connect();

    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      schemaCreated = true;
      await client.query("SELECT set_config('search_path', $1, false)", [schemaName]);
      await client.query(`
        CREATE TABLE contas (id INTEGER PRIMARY KEY);
        CREATE TABLE lojas (id INTEGER PRIMARY KEY, conta_id INTEGER NOT NULL);
        CREATE TABLE insumos (id INTEGER PRIMARY KEY, conta_id INTEGER NOT NULL);
        CREATE TABLE insumo_embalagens (
          id INTEGER PRIMARY KEY,
          conta_id INTEGER NOT NULL,
          insumo_id INTEGER NOT NULL,
          fator_conversao NUMERIC(12, 4) NOT NULL
        );
        CREATE TABLE compras (
          id SERIAL PRIMARY KEY,
          conta_id INTEGER NOT NULL,
          loja_id INTEGER NOT NULL,
          insumo_id INTEGER NOT NULL,
          embalagem_id INTEGER,
          qtd_embalagens NUMERIC(14, 3) NOT NULL,
          valor_total NUMERIC(12, 2) NOT NULL
        );
        CREATE TABLE contagens (
          id INTEGER PRIMARY KEY,
          conta_id INTEGER NOT NULL,
          loja_id INTEGER NOT NULL
        );
        CREATE TABLE contagem_itens (
          id SERIAL PRIMARY KEY,
          contagem_id INTEGER NOT NULL,
          insumo_id INTEGER NOT NULL,
          qtd_base NUMERIC(14, 3) NOT NULL
        );
        CREATE TABLE vendas_periodo (
          id SERIAL PRIMARY KEY,
          conta_id INTEGER NOT NULL,
          loja_id INTEGER NOT NULL,
          data_inicio DATE NOT NULL,
          data_fim DATE NOT NULL,
          faturamento NUMERIC(12, 2) NOT NULL
        );

        INSERT INTO contas (id) VALUES (1);
        INSERT INTO lojas (id, conta_id) VALUES (1, 1);
        INSERT INTO insumos (id, conta_id) VALUES (1, 1), (2, 1);
        INSERT INTO insumo_embalagens (id, conta_id, insumo_id, fator_conversao)
        VALUES (1, 1, 1, 10);
        INSERT INTO contagens (id, conta_id, loja_id) VALUES (1, 1, 1);
        INSERT INTO vendas_periodo
          (conta_id, loja_id, data_inicio, data_fim, faturamento)
        VALUES
          (1, 1, '2026-01-01', '2026-01-31', 100),
          (1, 1, '2026-01-01', '2026-01-31', 200);
      `);

      await expect(runMigration()).rejects.toThrow(/vendas duplicadas/i);
      await client.query('ROLLBACK');
      expect((await client.query('SELECT count(*) FROM vendas_periodo')).rows[0].count).toBe('2');

      await client.query('DELETE FROM vendas_periodo WHERE id = 2');
      await runMigration();

      await expectConstraintViolation(
        client,
        `INSERT INTO vendas_periodo
          (conta_id, loja_id, data_inicio, data_fim, faturamento)
         VALUES ($1, $2, $3, $4, $5)`,
        [1, 1, '2026-01-01', '2026-01-31', 300],
        'uq_vendas_periodo_conta_loja_datas',
      );
      await expectConstraintViolation(
        client,
        `INSERT INTO vendas_periodo
          (conta_id, loja_id, data_inicio, data_fim, faturamento)
         VALUES ($1, $2, $3, $4, $5)`,
        [1, 1, '2026-02-10', '2026-02-01', 100],
        'ck_vendas_periodo_datas_validas',
      );
      await expectConstraintViolation(
        client,
        `UPDATE vendas_periodo
         SET data_inicio = $1, data_fim = $2
         WHERE id = $3`,
        ['2026-02-10', '2026-02-01', 1],
        'ck_vendas_periodo_datas_validas',
      );
      await expectConstraintViolation(
        client,
        `INSERT INTO vendas_periodo
          (conta_id, loja_id, data_inicio, data_fim, faturamento)
         VALUES ($1, $2, $3, $4, $5)`,
        [1, 1, '2026-02-01', '2026-02-28', 0],
        'ck_vendas_periodo_faturamento_positivo',
      );
      await expectConstraintViolation(
        client,
        `INSERT INTO compras
          (conta_id, loja_id, insumo_id, embalagem_id, qtd_embalagens, valor_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [1, 1, 1, 1, 0, 100],
        'ck_compras_qtd_embalagens_positiva',
      );
      await expectConstraintViolation(
        client,
        `INSERT INTO compras
          (conta_id, loja_id, insumo_id, embalagem_id, qtd_embalagens, valor_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [1, 1, 1, 1, 1, 0],
        'ck_compras_valor_total_positivo',
      );
      await expectConstraintViolation(
        client,
        'UPDATE insumo_embalagens SET fator_conversao = $1 WHERE id = $2',
        [0, 1],
        'ck_insumo_embalagens_fator_conversao_positivo',
      );
      await expectConstraintViolation(
        client,
        `INSERT INTO contagem_itens (contagem_id, insumo_id, qtd_base)
         VALUES ($1, $2, $3)`,
        [1, 1, -1],
        'ck_contagem_itens_qtd_base_nao_negativa',
      );
      await expectConstraintViolation(
        client,
        `INSERT INTO compras
          (conta_id, loja_id, insumo_id, embalagem_id, qtd_embalagens, valor_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [1, 1, 2, 1, 1, 100],
        'fk_compras_embalagem_insumo_conta',
      );

      await runMigration();

      const constraintNames = [
        'uq_vendas_periodo_conta_loja_datas',
        'ck_vendas_periodo_datas_validas',
        'ck_vendas_periodo_faturamento_positivo',
        'ck_compras_qtd_embalagens_positiva',
        'ck_compras_valor_total_positivo',
        'ck_insumo_embalagens_fator_conversao_positivo',
        'ck_contagem_itens_qtd_base_nao_negativa',
        'uq_insumo_embalagens_id_insumo_conta',
        'fk_compras_embalagem_insumo_conta',
      ];
      const constraints = await client.query(
        `SELECT count(*)
         FROM pg_constraint
         WHERE connamespace = $1::regnamespace
           AND conname = ANY($2::text[])`,
        [schemaName, constraintNames],
      );
      expect(constraints.rows[0].count).toBe('9');
    } finally {
      await client.query('ROLLBACK').catch(() => {});

      try {
        if (schemaCreated) {
          if (!SAFE_SCHEMA_NAME.test(schemaName)) {
            throw new Error(`Refusing to drop unsafe test schema: ${schemaName}`);
          }

          await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
          const remaining = await client.query(
            'SELECT count(*) FROM pg_namespace WHERE nspname = $1',
            [schemaName],
          );
          expect(remaining.rows[0].count).toBe('0');
        }
      } finally {
        await client.end();
      }
    }
  });
});
