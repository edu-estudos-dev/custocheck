BEGIN;

-- Contas (clientes que assinam o SaaS)
CREATE TABLE IF NOT EXISTS contas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  plano VARCHAR(50) NOT NULL DEFAULT 'basic',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Usuários (quem loga)
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  papel VARCHAR(50) NOT NULL DEFAULT 'operador',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (papel IN ('dono', 'operador'))
);
CREATE INDEX IF NOT EXISTS idx_usuarios_conta_id ON usuarios(conta_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Lojas (filiais do cliente)
CREATE TABLE IF NOT EXISTS lojas (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cidade VARCHAR(255),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lojas_conta_id ON lojas(conta_id);

-- Insumos (produtos como açaí, leite, etc)
CREATE TABLE IF NOT EXISTS insumos (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  unidade_base VARCHAR(10) NOT NULL DEFAULT 'g',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (conta_id, nome),
  CHECK (unidade_base IN ('g', 'ml', 'un'))
);
CREATE INDEX IF NOT EXISTS idx_insumos_conta_id ON insumos(conta_id);

-- Embalagens de insumos
CREATE TABLE IF NOT EXISTS insumo_embalagens (
  id SERIAL PRIMARY KEY,
  insumo_id INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  fator_conversao NUMERIC(12,4) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_insumo_embalagens_insumo_id ON insumo_embalagens(insumo_id);

-- Compras de insumos
CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  insumo_id INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  embalagem_id INTEGER REFERENCES insumo_embalagens(id) ON DELETE SET NULL,
  qtd_embalagens NUMERIC(14,3) NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL,
  fornecedor VARCHAR(120),
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_compras_conta_id ON compras(conta_id);
CREATE INDEX IF NOT EXISTS idx_compras_loja_id ON compras(loja_id);
CREATE INDEX IF NOT EXISTS idx_compras_insumo_id ON compras(insumo_id);
CREATE INDEX IF NOT EXISTS idx_compras_data_compra ON compras(data_compra);

-- Contagens de estoque
CREATE TABLE IF NOT EXISTS contagens (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  data_referencia DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'aberta',
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (loja_id, data_referencia),
  CHECK (status IN ('aberta', 'fechada'))
);
CREATE INDEX IF NOT EXISTS idx_contagens_conta_id ON contagens(conta_id);
CREATE INDEX IF NOT EXISTS idx_contagens_loja_id ON contagens(loja_id);

-- Itens de contagem
CREATE TABLE IF NOT EXISTS contagem_itens (
  id SERIAL PRIMARY KEY,
  contagem_id INTEGER NOT NULL REFERENCES contagens(id) ON DELETE CASCADE,
  insumo_id INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  qtd_base NUMERIC(14,3) NOT NULL,
  UNIQUE (contagem_id, insumo_id)
);

-- Vendas por período
CREATE TABLE IF NOT EXISTS vendas_periodo (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  faturamento NUMERIC(12,2) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vendas_periodo_conta_id ON vendas_periodo(conta_id);
CREATE INDEX IF NOT EXISTS idx_vendas_periodo_loja_id ON vendas_periodo(loja_id);

COMMIT;
