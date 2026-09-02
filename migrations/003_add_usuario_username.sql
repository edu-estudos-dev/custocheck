BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario VARCHAR(50) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);

COMMIT;
