# CustoCheck

Controle de perda e CMV para açaiterias e sorveterias.

## Setup

### 1. Banco de Dados

Criar banco PostgreSQL 17 local:

```bash
"C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres custocheck
```

### 2. Variáveis de Ambiente

Copiar `.env.example` para `.env` e preencher:

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/custocheck
DB_SSL=false
SESSION_SECRET=<gerar string 32+ chars>
NODE_ENV=development
PORT=3000
```

### 3. Dependências

```bash
npm install
```

### 4. Migrations

```bash
npm run migrate:apply
```

### 5. Rodar

```bash
npm run dev
```

Acesso: `http://localhost:3000`

## Desenvolvimento

- `npm run dev` — servidor com reload
- `npm test` — testes unitários (não toca banco)
- `npm run test:integration` — testes de integração (Postgres real, schema temporário descartável)
- `npm run test:e2e` — testes ponta a ponta (Playwright, sobe o servidor de verdade)
- `npm run test:coverage` — cobertura
- `npm run lint` — ESLint
- `npm run migrate:dev -- --dry-run` — verificar migrations pendentes sem aplicar

## Operação

**CI** (`.github/workflows/ci.yml`): a cada push/PR pra `main` roda lint,
testes unitários e testes de integração (com Postgres de serviço). Testes
e2e não entram no CI ainda (precisam de servidor + browser Playwright) —
rodar localmente com `npm run test:e2e` antes de mergear mudanças
grandes em auth/fluxos de tela.

**RLS (Row Level Security)**: as tabelas de tenant têm política de acesso
por `conta_id` no banco (não só filtro na aplicação). Fica inativa até
`DATABASE_APP_URL` ser configurada apontando pra role `custocheck_app`
(sem privilégio de dono/superusuário) — ver comentário em
`.env.example` e `migrations/007_rls_policies.sql`.

**Observabilidade**: `/livez`, `/readyz`, `/healthz` (health checks) e
`/metrics` (Prometheus, via `prom-client`). Logs estruturados com Pino,
correlation ID por request.

## Design

Ver [DESIGN.md](./DESIGN.md) para tokens de cor, tipografia, componentes.

## Schema

9 tabelas: contas, usuarios, lojas, insumos, insumo_embalagens, compras, contagens, contagem_itens, vendas_periodo.

Multi-tenant: **todas as queries filtram por conta_id**.

## Status

✅ **Implementado:**
- Arquitetura Express com middlewares de segurança (Helmet, CSP, CSRF, rate-limiting)
- Autenticação com bcrypt
- Logger Pino com correlation ID
- Observabilidade: /livez, /readyz, /healthz, /metrics
- Models para todas as entidades
- Controllers CRUD para lojas, insumos, compras, vendas
- API JSON + EJS views
- Design system (roxo/dourado, tipografia Bricolage/Manrope)
- Testes unitários (Vitest)
- E2E tests (Playwright)
- Migrations com runner idempotente

## Setup Alternativo (sem Postgres local)

- **Docker**: `docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17`
- **Remote**: Supabase/neon (ajustar DB_SSL=true)
