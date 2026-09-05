import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { describe, expect, it } from 'vitest';

dotenv.config();

const { Client } = pg;
const SAFE_SCHEMA_NAME = /^custocheck_rls_[0-9a-f]+$/;
const SAFE_ROLE_NAME = /^custocheck_rls_role_[0-9a-f]+$/;
const migrationPath = fileURLToPath(new URL('../../migrations/007_rls_policies.sql', import.meta.url));

describe('007_rls_policies.sql', () => {
  it('isola linhas por conta_id pra role sem privilégio de dono/superusuário', async () => {
    const suffix = randomBytes(8).toString('hex');
    const schemaName = `custocheck_rls_${suffix}`;
    const roleName = `custocheck_rls_role_${suffix}`;
    const rolePassword = randomBytes(16).toString('hex');

    if (!SAFE_SCHEMA_NAME.test(schemaName) || !SAFE_ROLE_NAME.test(roleName)) {
      throw new Error('Refusing to use unsafe test schema/role name');
    }

    const admin = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : undefined,
      application_name: 'custocheck-rls-test-admin',
    });
    await admin.connect();

    let schemaCreated = false;
    let roleCreated = false;
    let roleClient;

    try {
      await admin.query(`CREATE SCHEMA "${schemaName}"`);
      schemaCreated = true;

      // Tabelas mínimas com os mesmos nomes que a migration real referencia,
      // dentro do schema temporário (via search_path), pra rodar a migration
      // real sem risco de tocar no schema public de verdade.
      await admin.query("SELECT set_config('search_path', $1, false)", [schemaName]);
      await admin.query(`
        CREATE TABLE lojas (id SERIAL PRIMARY KEY, conta_id INTEGER NOT NULL, nome TEXT);
        CREATE TABLE insumos (id SERIAL PRIMARY KEY, conta_id INTEGER NOT NULL, nome TEXT);
        CREATE TABLE insumo_embalagens (id SERIAL PRIMARY KEY, conta_id INTEGER NOT NULL, insumo_id INTEGER);
        CREATE TABLE compras (id SERIAL PRIMARY KEY, conta_id INTEGER NOT NULL, valor_total NUMERIC);
        CREATE TABLE contagens (id SERIAL PRIMARY KEY, conta_id INTEGER NOT NULL, status TEXT);
        CREATE TABLE contagem_itens (id SERIAL PRIMARY KEY, contagem_id INTEGER NOT NULL REFERENCES contagens(id), qtd_base NUMERIC);
        CREATE TABLE vendas_periodo (id SERIAL PRIMARY KEY, conta_id INTEGER NOT NULL, faturamento NUMERIC);
        ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;
        ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
        ALTER TABLE insumo_embalagens ENABLE ROW LEVEL SECURITY;
        ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
        ALTER TABLE contagens ENABLE ROW LEVEL SECURITY;
        ALTER TABLE contagem_itens ENABLE ROW LEVEL SECURITY;
        ALTER TABLE vendas_periodo ENABLE ROW LEVEL SECURITY;
      `);

      // Migration real cria a role custocheck_app (idempotente, cluster-wide)
      // e as políticas — aqui as políticas caem sobre as tabelas do schema
      // temporário porque search_path já está apontando pra ele.
      const migration = await readFile(migrationPath, 'utf8');
      await admin.query(migration);

      // Role descartável própria do teste (não mexe na custocheck_app real),
      // com as mesmas restrições (sem bypass de RLS, sem superusuário).
      await admin.query(
        `CREATE ROLE "${roleName}" LOGIN PASSWORD '${rolePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION`
      );
      roleCreated = true;
      await admin.query(`GRANT USAGE ON SCHEMA "${schemaName}" TO "${roleName}"`);
      await admin.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${schemaName}" TO "${roleName}"`
      );
      await admin.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "${schemaName}" TO "${roleName}"`);

      // Semeia uma linha de cada conta como admin (bypassa RLS, é dono).
      await admin.query('INSERT INTO lojas (id, conta_id, nome) VALUES (1, 1, $1), (2, 2, $2)', [
        'Loja A',
        'Loja B',
      ]);
      await admin.query('INSERT INTO contagens (id, conta_id, status) VALUES (10, 1, $1)', ['fechada']);
      await admin.query('INSERT INTO contagem_itens (contagem_id, qtd_base) VALUES (10, 5)');

      const url = new URL(process.env.DATABASE_URL);
      roleClient = new Client({
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.slice(1),
        user: roleName,
        password: rolePassword,
        ssl: process.env.DB_SSL === 'false' ? false : undefined,
        application_name: 'custocheck-rls-test-role',
      });
      await roleClient.connect();
      await roleClient.query("SELECT set_config('search_path', $1, false)", [schemaName]);

      // Sem app.conta_id setado: current_setting(...,true) vira NULL, e
      // NULL = qualquer coisa é sempre falso — nega tudo por padrão.
      const semContexto = await roleClient.query('SELECT * FROM lojas');
      expect(semContexto.rows).toHaveLength(0);

      // Com contexto da conta 1: só enxerga a própria loja.
      await roleClient.query('BEGIN');
      await roleClient.query("SELECT set_config('app.conta_id', '1', true)");
      const conta1 = await roleClient.query('SELECT * FROM lojas ORDER BY id');
      expect(conta1.rows.map((r) => r.id)).toEqual([1]);

      // Tentar inserir loja de outra conta na mesma transação viola o WITH CHECK.
      await expect(
        roleClient.query('INSERT INTO lojas (conta_id, nome) VALUES (2, $1)', ['Loja invasora'])
      ).rejects.toMatchObject({ code: '42501' }); // insufficient_privilege (RLS policy violation)
      await roleClient.query('ROLLBACK');

      // Com contexto da conta 2: não vê a loja da conta 1.
      await roleClient.query('BEGIN');
      await roleClient.query("SELECT set_config('app.conta_id', '2', true)");
      const conta2 = await roleClient.query('SELECT * FROM lojas ORDER BY id');
      expect(conta2.rows.map((r) => r.id)).toEqual([2]);
      await roleClient.query('COMMIT');

      // contagem_itens: isolado indiretamente pela contagem dona da linha.
      await roleClient.query('BEGIN');
      await roleClient.query("SELECT set_config('app.conta_id', '1', true)");
      const itensConta1 = await roleClient.query('SELECT * FROM contagem_itens');
      expect(itensConta1.rows).toHaveLength(1);
      await roleClient.query("SELECT set_config('app.conta_id', '2', true)");
      const itensConta2 = await roleClient.query('SELECT * FROM contagem_itens');
      expect(itensConta2.rows).toHaveLength(0);
      await roleClient.query('COMMIT');
    } finally {
      if (roleClient) await roleClient.end().catch(() => {});
      if (roleCreated) await admin.query(`DROP ROLE IF EXISTS "${roleName}"`).catch(() => {});
      if (schemaCreated) await admin.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
      await admin.end();
    }
  });
});
