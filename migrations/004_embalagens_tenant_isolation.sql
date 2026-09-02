BEGIN;

ALTER TABLE insumo_embalagens ADD COLUMN IF NOT EXISTS conta_id INTEGER REFERENCES contas(id) ON DELETE CASCADE;

UPDATE insumo_embalagens ie
SET conta_id = i.conta_id
FROM insumos i
WHERE ie.insumo_id = i.id AND ie.conta_id IS NULL;

ALTER TABLE insumo_embalagens ALTER COLUMN conta_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insumo_embalagens_conta_id ON insumo_embalagens(conta_id);

COMMIT;
