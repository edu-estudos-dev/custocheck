// Popula compras/vendas de exemplo pras lojas extras da conta 1
// (além da Loja Centro, já populada por seed-demo-data.js). Reaproveita
// os insumos/embalagens que já existem na conta. Script avulso, não
// entra no fluxo de deploy/migração.
import pool from '../src/config/database.js';

const CONTA_ID = 1;

const COMPRAS_POR_INSUMO = {
  'Polpa de Açaí': [
    { qtd: 5, valor: 360.0, fornecedor: 'Distribuidora Norte Fruit', diasAtras: 22 },
    { qtd: 3, valor: 222.0, fornecedor: 'Distribuidora Norte Fruit', diasAtras: 8 },
  ],
  'Leite Condensado': [{ qtd: 18, valor: 126.0, fornecedor: 'Atacadão Central', diasAtras: 19 }],
  Granola: [{ qtd: 6, valor: 114.0, fornecedor: 'Atacadão Central', diasAtras: 17 }],
  'Copo 500ml': [{ qtd: 8, valor: 168.0, fornecedor: 'Embalagens São Jorge', diasAtras: 27 }],
};

const VENDAS = [
  { diasInicioAtras: 60, diasFimAtras: 31 },
  { diasInicioAtras: 30, diasFimAtras: 1 },
];

// Faturamento varia por loja pra não ficar tudo igual.
const FATURAMENTO_POR_LOJA = {
  'Loja Praia': [11200.0, 12480.75],
  'Loja Aldeota': [6800.0, 7150.3],
  'Loja Shopping': [15300.5, 16020.0],
};

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insumoRows = (await client.query('SELECT id, nome FROM insumos WHERE conta_id = $1', [CONTA_ID])).rows;
    const embalagemRows = (
      await client.query('SELECT id, insumo_id FROM insumo_embalagens WHERE conta_id = $1', [CONTA_ID])
    ).rows;
    const lojaRows = (
      await client.query("SELECT id, nome FROM lojas WHERE conta_id = $1 AND nome != 'Loja Centro'", [CONTA_ID])
    ).rows;

    const insumoIdByNome = Object.fromEntries(insumoRows.map((r) => [r.nome, r.id]));
    const embalagemIdByInsumoId = Object.fromEntries(embalagemRows.map((r) => [r.insumo_id, r.id]));

    for (const loja of lojaRows) {
      for (const [nomeInsumo, compras] of Object.entries(COMPRAS_POR_INSUMO)) {
        const insumoId = insumoIdByNome[nomeInsumo];
        const embalagemId = embalagemIdByInsumoId[insumoId];
        for (const c of compras) {
          await client.query(
            `INSERT INTO compras (conta_id, loja_id, insumo_id, embalagem_id, qtd_embalagens, valor_total, fornecedor, data_compra)
             VALUES ($1,$2,$3,$4,$5,$6,$7, CURRENT_DATE - $8::int)`,
            [CONTA_ID, loja.id, insumoId, embalagemId, c.qtd, c.valor, c.fornecedor, c.diasAtras]
          );
        }
      }

      const faturamentos = FATURAMENTO_POR_LOJA[loja.nome] || [7000.0, 7500.0];
      for (let i = 0; i < VENDAS.length; i++) {
        const v = VENDAS[i];
        await client.query(
          `INSERT INTO vendas_periodo (conta_id, loja_id, data_inicio, data_fim, faturamento)
           VALUES ($1,$2, CURRENT_DATE - $3::int, CURRENT_DATE - $4::int, $5)`,
          [CONTA_ID, loja.id, v.diasInicioAtras, v.diasFimAtras, faturamentos[i]]
        );
      }

      console.log(`${loja.nome}: compras e vendas inseridas.`);
    }

    await client.query('COMMIT');
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
