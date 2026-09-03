# Bloco 1 — Integridade financeira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar os erros de precisão, períodos, relações financeiras e datas civis descritos na auditoria sem apagar dados existentes.

**Architecture:** Manter a arquitetura Express/PostgreSQL atual, concentrando validação em utilitários puros, regras de negócio nos controllers/services e invariantes permanentes numa nova migração. Cada comportamento recebe primeiro um teste de regressão; a migração é exercitada num schema temporário e removível.

**Tech Stack:** Node.js 20+, Express 4, PostgreSQL, ESM, Vitest, EJS.

**Spec:** `docs/superpowers/specs/2026-09-03-bloco-1-integridade-financeira-design.md`

## Global Constraints

- Não apagar, escolher nem consolidar vendas duplicadas automaticamente.
- Preservar números na API; arredondar somente totais monetários e percentuais finais.
- Tratar `YYYY-MM-DD` como data civil, sem conversão UTC.
- Retornar 400 para entradas inválidas e 409 para venda duplicada.
- Escrever e observar cada teste falhar antes de alterar o código correspondente.
- Não executar os E2E mutáveis contra o banco de desenvolvimento.

---

### Task 1: Precisão do custo e contagens distintas

**Files:**
- Modify: `tests/unit/costCalculation.test.js`
- Modify: `src/services/costCalculation.js`

**Interfaces:**
- Consumes: linhas `NUMERIC` retornadas por `pool.query` e contagens retornadas por `getUltimaContagemAte`.
- Produces: `calculateWeightedAverageCost(contaId, insumoId, dataInicio?, dataFim?)` com custo unitário não arredondado; `calculateResultadoPeriodo(...)` com `contagemCompleta` verdadeira apenas para IDs distintos.

- [ ] **Step 1: Escrever testes que expõem os dois erros**

Alterar o cenário de custo médio para exigir o literal abaixo e adicionar o cenário com a mesma contagem nos dois limites:

```js
expect(resultado).toEqual({ qtdBaseTotal: 10000, valorTotal: 350, custoMedio: 0.035 });

getUltimaContagemAteMock.mockResolvedValueOnce(contagem);
getUltimaContagemAteMock.mockResolvedValueOnce(contagem);
const r = await calculateResultadoPeriodo(1, 1, '2026-08-01', '2026-08-31');
expect(r.contagemCompleta).toBe(false);
expect(r.cmvReais).toBeNull();
expect(r.cmvPercent).toBe(35);
```

- [ ] **Step 2: Verificar RED**

Run: `npm test -- --run tests/unit/costCalculation.test.js`

Expected: falhar porque `custoMedio` vale `0.04` e/ou a mesma contagem é considerada completa.

- [ ] **Step 3: Implementar o mínimo**

Converter `qtd_base_total` e `custo_medio` com `parseFloat`, sem `roundMoney`; manter `valor_total` arredondado. Definir:

```js
const contagemCompleta = Boolean(
  contagemInicial && contagemFinal && contagemInicial.id !== contagemFinal.id
);
```

- [ ] **Step 4: Verificar GREEN**

Run: `npm test -- --run tests/unit/costCalculation.test.js`

Expected: todos os testes do arquivo passam.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/costCalculation.test.js src/services/costCalculation.js
git commit -m "fix: preserve financial calculation precision"
```

### Task 2: Validação financeira e relações de compra

**Files:**
- Create: `tests/unit/financialValidation.test.js`
- Create: `tests/unit/financialControllers.test.js`
- Modify: `src/utilities/validation.js`
- Modify: `src/controllers/compras.js`
- Modify: `src/controllers/vendas.js`
- Modify: `src/controllers/resultado.js`
- Modify: `src/controllers/contagens.js`
- Modify: `src/controllers/insumos.js`

**Interfaces:**
- Produces: `parseFiniteDecimal(value)`, `parsePositiveDecimal(value)`, `parseNonNegativeDecimal(value)`, `isIsoDate(value)` e `isValidDateRange(inicio, fim)`.
- Consumes: embalagem com os campos completos `id`, `conta_id`, `insumo_id`, `descricao`, `fator_conversao`, `criado_em`.

- [ ] **Step 1: Escrever testes puros de validação**

Cobrir literais válidos e inválidos:

```js
expect(parsePositiveDecimal('0.035')).toBe(0.035);
expect(() => parsePositiveDecimal(0)).toThrow();
expect(() => parseFiniteDecimal('12abc')).toThrow();
expect(() => parseFiniteDecimal(Infinity)).toThrow();
expect(parseNonNegativeDecimal(0)).toBe(0);
expect(isIsoDate('2026-02-29')).toBe(false);
expect(isIsoDate('2028-02-29')).toBe(true);
expect(isValidDateRange('2026-09-02', '2026-09-01')).toBe(false);
```

- [ ] **Step 2: Verificar RED da validação**

Run: `npm test -- --run tests/unit/financialValidation.test.js`

Expected: falhar porque as funções ainda não existem.

- [ ] **Step 3: Implementar os utilitários puros**

Usar `Number(value)`, `Number.isFinite`, comparação explícita e validação UTC por componentes para impedir normalização silenciosa de datas inexistentes.

- [ ] **Step 4: Verificar GREEN da validação**

Run: `npm test -- --run tests/unit/financialValidation.test.js`

Expected: todos passam.

- [ ] **Step 5: Escrever testes dos controllers**

Com banco/modelos mockados apenas na fronteira externa, verificar respostas observáveis:

```js
expect(res.status).toHaveBeenCalledWith(400); // embalagem.insumo_id diferente
expect(res.status).toHaveBeenCalledWith(400); // valores <= 0, NaN/Infinity ou data inválida
expect(res.status).toHaveBeenCalledWith(409); // erro PostgreSQL 23505 em venda
```

Também verificar que resultado rejeita intervalo invertido, contagem rejeita data inválida e embalagem rejeita fator não positivo.

- [ ] **Step 6: Verificar RED dos controllers**

Run: `npm test -- --run tests/unit/financialControllers.test.js`

Expected: respostas atuais divergem de 400/409 ou persistência é chamada com dados inválidos.

- [ ] **Step 7: Aplicar validação mínima nos controllers**

Normalizar números antes de chamar models; responder 400 para `TypeError` de validação; comparar `String(embalagem.insumo_id)` com `String(insumoId)`; mapear `error.code === '23505'` de vendas para 409.

- [ ] **Step 8: Verificar GREEN e regressão**

Run: `npm test -- --run tests/unit/financialValidation.test.js tests/unit/financialControllers.test.js`

Expected: todos passam.

- [ ] **Step 9: Commit**

```bash
git add tests/unit/financialValidation.test.js tests/unit/financialControllers.test.js src/utilities/validation.js src/controllers
git commit -m "fix: validate financial inputs and purchase relations"
```

### Task 3: Datas civis no navegador

**Files:**
- Create: `public/js/date-only.js`
- Create: `tests/unit/dateOnly.test.js`
- Modify: `src/views/compras.ejs`
- Modify: `src/views/vendas.ejs`
- Modify: `src/views/contagens.ejs`

**Interfaces:**
- Produces: `formatDateOnly(value)` exportado como módulo ESM.
- Consumes: strings `YYYY-MM-DD` ou prefixos `YYYY-MM-DD` de valores de data.

- [ ] **Step 1: Escrever teste independente de fuso**

```js
expect(formatDateOnly('2026-09-01')).toBe('01/09/2026');
expect(formatDateOnly('2026-09-01T00:00:00.000Z')).toBe('01/09/2026');
expect(formatDateOnly('')).toBe('');
```

- [ ] **Step 2: Verificar RED**

Run: `npm test -- --run tests/unit/dateOnly.test.js`

Expected: falhar porque o módulo ainda não existe.

- [ ] **Step 3: Implementar e usar o módulo**

Validar o prefixo com regex, devolver vazio para entrada inválida e montar `DD/MM/YYYY` por componentes. Tornar os três scripts EJS módulos e importar:

```js
import { formatDateOnly } from '/js/date-only.js';
```

Substituir apenas os `new Date(...)` aplicados a `data_compra`, `data_inicio`, `data_fim` e `data_referencia`.

- [ ] **Step 4: Verificar GREEN**

Run: `npm test -- --run tests/unit/dateOnly.test.js`

Expected: todos passam com `TZ=America/Fortaleza` e com `TZ=UTC`.

- [ ] **Step 5: Commit**

```bash
git add public/js/date-only.js tests/unit/dateOnly.test.js src/views/compras.ejs src/views/vendas.ejs src/views/contagens.ejs
git commit -m "fix: format database dates without timezone shifts"
```

### Task 4: Constraints financeiros e diagnóstico de duplicidade

**Files:**
- Create: `migrations/006_financial_integrity.sql`
- Create: `tests/integration/financialIntegrityMigration.test.js`
- Create: `vitest.integration.config.js`
- Modify: `package.json`

**Interfaces:**
- Produces: configuração e script `npm run test:integration`; migração idempotente `006_financial_integrity.sql`.
- Consumes: PostgreSQL indicado por `DATABASE_URL`; o teste cria um schema com nome aleatório validado, executa a migração e remove somente esse schema no `finally`.

- [ ] **Step 1: Escrever teste de integração da migração**

O teste deve criar tabelas mínimas num schema `custocheck_block1_<hex>`, inserir duas vendas com a mesma chave, executar a migração e provar:

```js
await expect(runMigration()).rejects.toThrow(/vendas duplicadas/i);
expect((await client.query('SELECT count(*) FROM vendas_periodo')).rows[0].count).toBe('2');
```

Após remover uma duplicata, executar novamente e provar por inserts reais que venda duplicada, datas invertidas, valores não positivos e embalagem incompatível são rejeitados. O `finally` deve validar o nome com `/^custocheck_block1_[0-9a-f]+$/` antes de `DROP SCHEMA ... CASCADE`.

- [ ] **Step 2: Verificar RED**

Run: `npm run test:integration -- --run tests/integration/financialIntegrityMigration.test.js`

Expected: falhar porque a migração ainda não existe.

- [ ] **Step 3: Criar a migração**

Usar um bloco `DO` para agregar no máximo 20 grupos duplicados em JSON e lançar exceção antes do `UNIQUE`. Adicionar constraints nomeados, protegidos por consulta a `pg_constraint`, para unicidade, datas, valores e a FK composta `(embalagem_id, insumo_id, conta_id)`.

- [ ] **Step 4: Verificar GREEN da migração**

Run: `npm run test:integration -- --run tests/integration/financialIntegrityMigration.test.js`

Expected: todos passam e nenhum schema `custocheck_block1_*` permanece.

- [ ] **Step 5: Verificar migração pendente sem aplicar ao banco de desenvolvimento**

Run: `node scripts/run-migrations.js dev --dry-run`

Expected: listar `006_financial_integrity.sql`; não executar a migração 006.

- [ ] **Step 6: Commit**

```bash
git add migrations/006_financial_integrity.sql tests/integration/financialIntegrityMigration.test.js vitest.integration.config.js package.json
git commit -m "fix: enforce financial integrity in postgres"
```

### Task 5: Verificação consolidada do bloco

**Files:**
- Modify only if a regression is found in a file already owned by Tasks 1–4.

**Interfaces:**
- Consumes: all deliverables from Tasks 1–4.
- Produces: a verified branch ready for review and integration.

- [ ] **Step 1: Executar testes unitários**

Run: `npm test -- --run`

Expected: todos passam; testes de integração permanecem fora da suíte unitária padrão.

- [ ] **Step 2: Executar integração isolada**

Run: `npm run test:integration -- --run`

Expected: todos passam e o schema temporário é removido.

- [ ] **Step 3: Validar JavaScript e testes E2E sem mutação**

Run: validação `node --check` em todos os arquivos JS e `npm run test:e2e -- --list`.

Expected: zero falhas de sintaxe e 15 ou mais testes E2E coletados.

- [ ] **Step 4: Verificar qualidade do diff**

Run: `git diff --check` e `git status --short`.

Expected: sem whitespace inválido; somente arquivos previstos pelo plano.

- [ ] **Step 5: Confirmar que não há correção consolidada pendente**

Run: `git status --short`

Expected: nenhuma alteração não commitada; se uma regressão exigir correção, ela deve voltar à tarefa proprietária e repetir o ciclo RED/GREEN antes desta verificação.
