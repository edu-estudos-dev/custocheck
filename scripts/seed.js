import bcrypt from 'bcrypt';
import pool from '../src/config/database.js';

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Criar conta
    const contaResult = await client.query(
      'INSERT INTO contas (nome, email, plano) VALUES ($1, $2, $3) RETURNING id',
      ['Açaíteria Teste', 'teste@custocheck.com.br', 'basic']
    );
    const contaId = contaResult.rows[0].id;
    console.log(`✓ Conta criada: ID ${contaId}`);

    // Criar usuário dono
    const senhaBcrypt = await bcrypt.hash('senha123', 10);
    const usuarioResult = await client.query(
      'INSERT INTO usuarios (conta_id, nome, email, senha_hash, papel) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [contaId, 'Dono Teste', 'dono@custocheck.com.br', senhaBcrypt, 'dono']
    );
    const usuarioId = usuarioResult.rows[0].id;
    console.log(`✓ Usuário dono criado: ID ${usuarioId}`);

    // Criar loja
    const lojaResult = await client.query(
      'INSERT INTO lojas (conta_id, nome, cidade) VALUES ($1, $2, $3) RETURNING id',
      [contaId, 'Loja Centro', 'Fortaleza']
    );
    const lojaId = lojaResult.rows[0].id;
    console.log(`✓ Loja criada: ID ${lojaId}`);

    await client.query('COMMIT');

    console.log('\nCredenciais de teste:');
    console.log('Email: dono@custocheck.com.br');
    console.log('Senha: senha123');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('✗ Erro:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
