import pool from '../config/database.js';
import { logger } from './logger.js';

const startTime = Date.now();

const checkDatabase = async () => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('DB check timeout')), 2000)
  );

  try {
    await Promise.race([
      pool.query('SELECT NOW()'),
      timeout,
    ]);
    return { ok: true };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return { ok: false, error: error.message };
  }
};

export const livez = async (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
};

export const readyz = async (req, res) => {
  const dbCheck = await checkDatabase();
  const ready = dbCheck.ok;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not ready',
    checks: { database: dbCheck },
    timestamp: new Date().toISOString(),
  });
};

export const healthz = async (req, res) => {
  const dbCheck = await checkDatabase();
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memory = process.memoryUsage();

  res.json({
    status: 'healthy',
    version: '0.1.0',
    uptime,
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
    },
    checks: { database: dbCheck },
    timestamp: new Date().toISOString(),
  });
};
