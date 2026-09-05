BEGIN;

DO $$
DECLARE
  duplicate_groups JSONB;
BEGIN
  SELECT jsonb_agg(to_jsonb(duplicate_group))
  INTO duplicate_groups
  FROM (
    SELECT
      conta_id,
      loja_id,
      data_inicio,
      data_fim,
      count(*) AS quantidade
    FROM vendas_periodo
    GROUP BY conta_id, loja_id, data_inicio, data_fim
    HAVING count(*) > 1
    ORDER BY conta_id, loja_id, data_inicio, data_fim
    LIMIT 20
  ) AS duplicate_group;

  IF duplicate_groups IS NOT NULL THEN
    RAISE EXCEPTION 'Vendas duplicadas impedem a migração: %', duplicate_groups;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'vendas_periodo'::regclass
      AND conname = 'uq_vendas_periodo_conta_loja_datas'
  ) THEN
    ALTER TABLE vendas_periodo
      ADD CONSTRAINT uq_vendas_periodo_conta_loja_datas
      UNIQUE (conta_id, loja_id, data_inicio, data_fim);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'vendas_periodo'::regclass
      AND conname = 'ck_vendas_periodo_datas_validas'
  ) THEN
    ALTER TABLE vendas_periodo
      ADD CONSTRAINT ck_vendas_periodo_datas_validas
      CHECK (data_inicio <= data_fim);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'vendas_periodo'::regclass
      AND conname = 'ck_vendas_periodo_faturamento_positivo'
  ) THEN
    ALTER TABLE vendas_periodo
      ADD CONSTRAINT ck_vendas_periodo_faturamento_positivo
      CHECK (faturamento > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'compras'::regclass
      AND conname = 'ck_compras_qtd_embalagens_positiva'
  ) THEN
    ALTER TABLE compras
      ADD CONSTRAINT ck_compras_qtd_embalagens_positiva
      CHECK (qtd_embalagens > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'compras'::regclass
      AND conname = 'ck_compras_valor_total_positivo'
  ) THEN
    ALTER TABLE compras
      ADD CONSTRAINT ck_compras_valor_total_positivo
      CHECK (valor_total > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'insumo_embalagens'::regclass
      AND conname = 'ck_insumo_embalagens_fator_conversao_positivo'
  ) THEN
    ALTER TABLE insumo_embalagens
      ADD CONSTRAINT ck_insumo_embalagens_fator_conversao_positivo
      CHECK (fator_conversao > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'contagem_itens'::regclass
      AND conname = 'ck_contagem_itens_qtd_base_nao_negativa'
  ) THEN
    ALTER TABLE contagem_itens
      ADD CONSTRAINT ck_contagem_itens_qtd_base_nao_negativa
      CHECK (qtd_base >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'insumo_embalagens'::regclass
      AND conname = 'uq_insumo_embalagens_id_insumo_conta'
  ) THEN
    ALTER TABLE insumo_embalagens
      ADD CONSTRAINT uq_insumo_embalagens_id_insumo_conta
      UNIQUE (id, insumo_id, conta_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'compras'::regclass
      AND conname = 'fk_compras_embalagem_insumo_conta'
  ) THEN
    ALTER TABLE compras
      ADD CONSTRAINT fk_compras_embalagem_insumo_conta
      FOREIGN KEY (embalagem_id, insumo_id, conta_id)
      REFERENCES insumo_embalagens (id, insumo_id, conta_id);
  END IF;
END
$$;

COMMIT;
