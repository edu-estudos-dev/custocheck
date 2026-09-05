import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not defined');
}

// Timezone via opção de conexão (o Postgres aplica antes da 1ª query) em
// vez de rodar "SET TIME ZONE" no evento 'connect': esse evento é
// fire-and-forget — o pool pode entregar o client pra próxima query antes
// da SET terminar, gerando "client.query() called while already
// executing" (aviso de depreciação do pg, remoção em pg@9).
const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_POOL_MAX || '6', 10),
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS || '60000', 10),
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS || '10000', 10),
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  application_name: 'custocheck',
  options: '-c timezone=America/Fortaleza',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Pool separado, conectado como role sem privilégio de superusuário/dono
// (custocheck_app, ver migrations/007_rls_policies.sql). Sem
// DATABASE_APP_URL configurada, cai de volta na mesma conexão de sempre —
// RLS fica inerte (como hoje) até a role real ser criada e apontada aqui.
const appConnectionString = process.env.DATABASE_APP_URL || connectionString;
const appPool = appConnectionString === connectionString
  ? pool
  : new Pool({
      connectionString: appConnectionString,
      max: parseInt(process.env.DATABASE_POOL_MAX || '6', 10),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS || '60000', 10),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS || '10000', 10),
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: process.env.NODE_ENV === 'production' },
      application_name: 'custocheck-app-role',
      options: '-c timezone=America/Fortaleza',
    });

if (appPool !== pool) {
  appPool.on('error', (err) => {
    console.error('Unexpected error on idle client (app pool)', err);
  });
}

// Toda operação de dado de tenant (lojas, insumos, compras, contagens,
// vendas) passa por aqui: fixa app.conta_id na transação pra RLS filtrar
// sozinho no banco, além do WHERE conta_id que o model já faz.
export const tenantTransaction = async (contaId, callback) => {
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL não aceita bind params; set_config(..., true) aceita e faz
    // o mesmo (escopo da transação atual).
    await client.query("SELECT set_config('app.conta_id', $1, true)", [String(contaId)]);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

export const tenantQuery = (contaId, text, params) =>
  tenantTransaction(contaId, (client) => client.query(text, params));

export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      console.error('Rollback failed:', e);
    }
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
