import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const adminConnection = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  port: 5432,
  password: '',
});

try {
  await adminConnection.connect();
  console.log('Conectado ao PostgreSQL');

  const result = await adminConnection.query(
    "SELECT datname FROM pg_database WHERE datname = 'custocheck'"
  );

  if (result.rows.length === 0) {
    console.log('Criando banco custocheck...');
    await adminConnection.query('CREATE DATABASE custocheck');
    console.log('✓ Banco custocheck criado');
  } else {
    console.log('✓ Banco custocheck já existe');
  }

  await adminConnection.end();
  console.log('Desconectado');
} catch (error) {
  console.error('Erro:', error.message);
  process.exit(1);
}
