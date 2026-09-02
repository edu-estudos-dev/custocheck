# Migrations

Sequencial numerado, idempotente. Cada arquivo:

1. Envolto em `BEGIN; ... COMMIT;`
2. Usa `IF NOT EXISTS`, `IF NOT IN`, etc
3. Comentário explicando **por quê** a mudança existe
4. Todos os `CREATE TABLE` terminam com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

Rodar com:

```bash
# Dev dry-run
NODE_ENV=development node scripts/run-migrations.js dev --dry-run

# Dev apply
NODE_ENV=development node scripts/run-migrations.js dev

# Verificar
NODE_ENV=development node scripts/run-migrations.js dev
# Esperado: "No pending migrations"
```

Nunca rodar DDL direto em produção.
