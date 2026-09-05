BEGIN;

-- RLS de verdade: até aqui as tabelas só tinham ENABLE ROW LEVEL SECURITY
-- (migration 002) sem nenhuma política — decorativo, e a conexão da app
-- usa o dono/superusuário, que ignora RLS de qualquer jeito. Isso cria uma
-- role sem privilégio de dono/superusuário e políticas por conta_id, como
-- segunda trava além do WHERE conta_id que o código já faz.
--
-- A app só passa a usar essa role de verdade quando DATABASE_APP_URL for
-- configurada (ver src/config/database.js); até lá isso fica instalado no
-- banco mas inerte, sem risco pra conexão atual.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'custocheck_app') THEN
    CREATE ROLE custocheck_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO custocheck_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  lojas, insumos, insumo_embalagens, compras, contagens, contagem_itens, vendas_periodo
  TO custocheck_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO custocheck_app;

-- CREATE POLICY não tem IF NOT EXISTS; DROP + CREATE mantém idempotente.
DROP POLICY IF EXISTS tenant_isolation ON lojas;
CREATE POLICY tenant_isolation ON lojas
  USING (conta_id = current_setting('app.conta_id', true)::int)
  WITH CHECK (conta_id = current_setting('app.conta_id', true)::int);

DROP POLICY IF EXISTS tenant_isolation ON insumos;
CREATE POLICY tenant_isolation ON insumos
  USING (conta_id = current_setting('app.conta_id', true)::int)
  WITH CHECK (conta_id = current_setting('app.conta_id', true)::int);

DROP POLICY IF EXISTS tenant_isolation ON insumo_embalagens;
CREATE POLICY tenant_isolation ON insumo_embalagens
  USING (conta_id = current_setting('app.conta_id', true)::int)
  WITH CHECK (conta_id = current_setting('app.conta_id', true)::int);

DROP POLICY IF EXISTS tenant_isolation ON compras;
CREATE POLICY tenant_isolation ON compras
  USING (conta_id = current_setting('app.conta_id', true)::int)
  WITH CHECK (conta_id = current_setting('app.conta_id', true)::int);

DROP POLICY IF EXISTS tenant_isolation ON contagens;
CREATE POLICY tenant_isolation ON contagens
  USING (conta_id = current_setting('app.conta_id', true)::int)
  WITH CHECK (conta_id = current_setting('app.conta_id', true)::int);

DROP POLICY IF EXISTS tenant_isolation ON vendas_periodo;
CREATE POLICY tenant_isolation ON vendas_periodo
  USING (conta_id = current_setting('app.conta_id', true)::int)
  WITH CHECK (conta_id = current_setting('app.conta_id', true)::int);

-- contagem_itens não tem conta_id direto: isola pela contagem dona da linha.
DROP POLICY IF EXISTS tenant_isolation ON contagem_itens;
CREATE POLICY tenant_isolation ON contagem_itens
  USING (EXISTS (
    SELECT 1 FROM contagens c
    WHERE c.id = contagem_itens.contagem_id
      AND c.conta_id = current_setting('app.conta_id', true)::int
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM contagens c
    WHERE c.id = contagem_itens.contagem_id
      AND c.conta_id = current_setting('app.conta_id', true)::int
  ));

COMMIT;
