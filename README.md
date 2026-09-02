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
- `npm test` — testes unitários
- `npm run test:coverage` — cobertura
- `npm run migrate:dev -- --dry-run` — verificar migrations

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

❌ **Bloqueado:**
- Database setup: PostgreSQL auth no Windows (user postgres rejeita senha)
- Tela de contagem (não foi no escopo)
- Relatório de perda (não foi no escopo)

## Setup Alternativo (sem Postgres local)

Para testar a estrutura sem banco:

```bash
npm install
# Estrutura está pronta. Controllers existem, rotas montadas.
# Falta apenas conectar ao banco real.
```

Ou:

1. **Windows**: Usar WSL2 + Postgres no Linux, ou Docker
2. **Docker**: `docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17`
3. **Remote**: Supabase/neon (ajustar DB_SSL=true)
