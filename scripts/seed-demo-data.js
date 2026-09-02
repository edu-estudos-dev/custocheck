// Popula insumos/compras/vendas de exemplo na conta/loja já existentes,
// só pra ver as telas com conteúdo em vez de estado vazio. Script avulso,
// não faz parte do fluxo de deploy.
import pool from '../src/config/database.js';

const CONTA_ID = 1;
const LOJA_ID = 1;

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insumos = [
      { nome: 'Polpa de Açaí', unidade: 'g', embalagem: 'Balde 4kg', fator: 4000 },
      { nome: 'Leite Condensado', unidade: 'g', embalagem: 'Lata 395g', fator: 395 },
      { nome: 'Granola', unidade: 'g', embalagem: 'Pacote 1kg', fator: 1000 },
      { nome: 'Copo 500ml', unidade: 'un', embalagem: 'Pacote 100un', fator: 100 },
    ];

    const insumoIds = {};
    const embalagemIds = {};

    for (const i of insumos) {
      const r = await client.query(
        'INSERT INTO insumos (conta_id, nome, unidade_base) VALUES ($1,$2,$3) RETURNING id',
        [CONTA_ID, i.nome, i.unidade]
      );
      insumoIds[i.nome] = r.rows[0].id;

      const e = await client.query(
        'INSERT INTO insumo_embalagens (conta_id, insumo_id, descricao, fator_conversao) VALUES ($1,$2,$3,$4) RETURNING id',
        [CONTA_ID, r.rows[0].id, i.embalagem, i.fator]
      );
      embalagemIds[i.nome] = e.rows[0].id;
    }

    const compras = [
      { insumo: 'Polpa de Açaí', qtd: 6, valor: 432.0, fornecedor: 'Distribuidora Norte Fruit', diasAtras: 25 },
      { insumo: 'Polpa de Açaí', qtd: 4, valor: 296.0, fornecedor: 'Distribuidora Norte Fruit', diasAtras: 10 },
      { insumo: 'Leite Condensado', qtd: 24, valor: 168.0, fornecedor: 'Atacadão Central', diasAtras: 20 },
      { insumo: 'Granola', qtd: 8, valor: 152.0, fornecedor: 'Atacadão Central', diasAtras: 18 },
      { insumo: 'Copo 500ml', qtd: 10, valor: 210.0, fornecedor: 'Embalagens São Jorge', diasAtras: 30 },
    ];

    for (const c of compras) {
      await client.query(
        `INSERT INTO compras (conta_id, loja_id, insumo_id, embalagem_id, qtd_embalagens, valor_total, fornecedor, data_compra)
         VALUES ($1,$2,$3,$4,$5,$6,$7, CURRENT_DATE - $8::int)`,
        [CONTA_ID, LOJA_ID, insumoIds[c.insumo], embalagemIds[c.insumo], c.qtd, c.valor, c.fornecedor, c.diasAtras]
      );
    }

    await client.query(
      `INSERT INTO vendas_periodo (conta_id, loja_id, data_inicio, data_fim, faturamento)
       VALUES ($1,$2, CURRENT_DATE - 60, CURRENT_DATE - 31, 8420.50)`,
      [CONTA_ID, LOJA_ID]
    );
    await client.query(
      `INSERT INTO vendas_periodo (conta_id, loja_id, data_inicio, data_fim, faturamento)
       VALUES ($1,$2, CURRENT_DATE - 30, CURRENT_DATE - 1, 9150.00)`,
      [CONTA_ID, LOJA_ID]
    );

    await client.query('COMMIT');
    console.log('Dados de exemplo inseridos: 4 insumos, 5 compras, 2 vendas.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
