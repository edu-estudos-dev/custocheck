import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../migrations');

const createSchemaTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Lê o histórico sem criar nada: dry-run precisa ser leitura pura. Se a
// tabela de controle ainda não existe, não há nenhuma migration aplicada.
const getAppliedMigrations = async (client) => {
  const exists = await client.query(`SELECT to_regclass('public.schema_migrations') AS t`);
  if (!exists.rows[0].t) return [];

  const result = await client.query('SELECT filename FROM schema_migrations');
  return result.rows.map(r => r.filename);
};

const getMigrationFiles = () => {
  const files = fs.readdirSync(migrationsDir);
  return files
    .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
    .sort();
};

const runMigration = async (client, filename) => {
  const filePath = path.join(migrationsDir, filename);
  const content = fs.readFileSync(filePath, 'utf-8');

  console.log(`  Applying ${filename}...`);

  await client.query(content);
  await client.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1)',
    [filename]
  );
};

const main = async () => {
  const env = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');

  if (!env || !['dev', 'prod'].includes(env)) {
    console.error('Usage: node run-migrations.js [dev|prod] [--dry-run]');
    process.exit(1);
  }

  console.log(`Running migrations (${env}${dryRun ? ', dry-run' : ''})`);

  const client = await pool.connect();
  try {
    const applied = await getAppliedMigrations(client);
    const all = getMigrationFiles();
    const pending = all.filter(f => !applied.includes(f));

    if (pending.length === 0) {
      console.log('✓ No pending migrations.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):`);

    if (dryRun) {
      console.log('DRY RUN MODE — no changes applied');
      pending.forEach(f => console.log(`  - ${f}`));
      return;
    }

    await createSchemaTable(client);
    await client.query('BEGIN');

    for (const filename of pending) {
      await runMigration(client, filename);
    }

    await client.query('COMMIT');
    console.log(`✓ Applied ${pending.length} migration(s)`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

main();
