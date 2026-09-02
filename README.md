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
