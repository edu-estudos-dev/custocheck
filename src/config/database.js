import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not defined');
}

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_POOL_MAX || '6', 10),
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS || '60000', 10),
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS || '10000', 10),
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  application_name: 'custocheck',
});

pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'America/Fortaleza'");
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

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
