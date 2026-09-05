import { test, expect } from '@playwright/test';
import { primeCsrf } from './helpers/csrf.js';

const randomEmail = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.com`;

const signupAndGetCsrf = async (request, nome, email) => {
  const preCsrf = await primeCsrf(request);
  const res = await request.post('/auth/signup', {
    headers: { Accept: 'application/json', 'X-CSRF-Token': preCsrf },
    data: { nome, email, senha: 'SenhaForte123' },
  });
  expect(res.status()).toBe(201);
  const state = await request.storageState();
  return state.cookies.find((c) => c.name === 'csrf_token')?.value;
};

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

test.describe('Contagem e Resultado do período', () => {
  test('fluxo completo: loja, insumo, compra, contagem inicial/final, venda -> CMV real', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const csrf = await signupAndGetCsrf(ctx, 'Dono Fluxo', randomEmail('fluxo'));
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf };

    const loja = await ctx
      .post('/api/lojas', { headers, data: { nome: 'Loja E2E', cidade: 'Fortaleza' } })
      .then((r) => r.json());

    const insumo = await ctx
      .post('/api/insumos', { headers, data: { nome: 'Polpa E2E', unidadeBase: 'g' } })
      .then((r) => r.json());

    // Compra no meio do período (20 dias atrás), R$100 por 1000g -> custo médio R$0.10/g
    const compraRes = await ctx.post('/api/compras', {
      headers,
      data: {
        lojaId: loja.id,
        insumoId: insumo.id,
        qtdEmbalagens: 1000,
        valorTotal: 100,
        dataCompra: daysAgo(20),
      },
    });
    expect(compraRes.status()).toBe(201);

    // Contagem inicial (31 dias atrás = início do período, antes da compra): sobrou 0g -> estoque inicial R$0
    const contagemInicialRes = await ctx.post('/api/contagens', {
      headers,
      data: {
        lojaId: loja.id,
        dataReferencia: daysAgo(31),
        itens: [{ insumoId: insumo.id, qtdBase: 0 }],
      },
    });
    expect(contagemInicialRes.status()).toBe(201);
    const contagemInicial = await contagemInicialRes.json();

    // Contagem final (hoje): sobrou 200g -> estoque final 200 * 0.10 = R$20
    const contagemFinalRes = await ctx.post('/api/contagens', {
      headers,
      data: {
        lojaId: loja.id,
        dataReferencia: daysAgo(0),
        itens: [{ insumoId: insumo.id, qtdBase: 200 }],
      },
    });
    expect(contagemFinalRes.status()).toBe(201);
    const contagemFinal = await contagemFinalRes.json();

    const vendaRes = await ctx.post('/api/vendas', {
      headers,
      data: { lojaId: loja.id, dataInicio: daysAgo(31), dataFim: daysAgo(0), faturamento: 500 },
    });
    expect(vendaRes.status()).toBe(201);

    const resultadoRes = await ctx.get(
      `/api/resultado?lojaId=${loja.id}&dataInicio=${daysAgo(31)}&dataFim=${daysAgo(0)}`
    );
    expect(resultadoRes.status()).toBe(200);
    const resultado = await resultadoRes.json();

    // CMV = estoqueInicial(0) + compras(100) - estoqueFinal(20) = 80; 80/500*100 = 16%
    expect(resultado.contagemCompleta).toBe(true);
    expect(resultado.estoqueInicial).toBe(0);
    expect(resultado.estoqueFinal).toBe(20);
    expect(resultado.comprasPeriodo).toBe(100);
    expect(resultado.cmvReais).toBe(80);
    expect(resultado.cmvPercent).toBe(16);

    // Editar a contagem final: sobrou 50g em vez de 200g -> estoque final R$5, CMV muda
    const updateRes = await ctx.put(`/api/contagens/${contagemFinal.id}`, {
      headers,
      data: { dataReferencia: daysAgo(0), itens: [{ insumoId: insumo.id, qtdBase: 50 }] },
    });
    expect(updateRes.status()).toBe(200);

    const resultado2 = await ctx
      .get(`/api/resultado?lojaId=${loja.id}&dataInicio=${daysAgo(31)}&dataFim=${daysAgo(0)}`)
      .then((r) => r.json());
    expect(resultado2.estoqueFinal).toBe(5);
    expect(resultado2.cmvReais).toBe(95); // 0 + 100 - 5

    // Excluir a contagem final: só sobra a inicial cobrindo o período inteiro.
    // Mesma contagem nos dois limites não conta como "completa" (evita
    // assumir estoque parado o mês inteiro por engano) — cai pro CMV
    // aproximado, igual a não ter nenhuma contagem no período.
    const deleteRes = await ctx.delete(`/api/contagens/${contagemFinal.id}`, { headers });
    expect(deleteRes.status()).toBe(200);

    const getDeletedRes = await ctx.get(`/api/contagens/${contagemFinal.id}`);
    expect(getDeletedRes.status()).toBe(404);

    const resultadoComFallback = await ctx
      .get(`/api/resultado?lojaId=${loja.id}&dataInicio=${daysAgo(31)}&dataFim=${daysAgo(0)}`)
      .then((r) => r.json());
    expect(resultadoComFallback.contagemCompleta).toBe(false);
    expect(resultadoComFallback.cmvPercent).toBe(20); // 100/500*100, igual a sem nenhuma contagem

    // Excluir a contagem inicial também: agora não sobra nenhuma contagem
    // no período, cai pro CMV aproximado (compras/faturamento).
    const deleteInicialRes = await ctx.delete(`/api/contagens/${contagemInicial.id}`, { headers });
    expect(deleteInicialRes.status()).toBe(200);

    const resultado3 = await ctx
      .get(`/api/resultado?lojaId=${loja.id}&dataInicio=${daysAgo(31)}&dataFim=${daysAgo(0)}`)
      .then((r) => r.json());
    expect(resultado3.contagemCompleta).toBe(false);
    expect(resultado3.cmvPercent).toBe(20); // 100/500*100

    await ctx.dispose();
  });

  test('conta B não acessa nem edita contagem da conta A', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const ctxB = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });

    const csrfA = await signupAndGetCsrf(ctxA, 'Dono A2', randomEmail('a2'));
    const csrfB = await signupAndGetCsrf(ctxB, 'Dono B2', randomEmail('b2'));
    const headersA = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfA };
    const headersB = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfB };

    const loja = await ctxA
      .post('/api/lojas', { headers: headersA, data: { nome: 'Loja A2' } })
      .then((r) => r.json());
    const insumo = await ctxA
      .post('/api/insumos', { headers: headersA, data: { nome: 'Insumo A2', unidadeBase: 'g' } })
      .then((r) => r.json());
    const contagem = await ctxA
      .post('/api/contagens', {
        headers: headersA,
        data: { lojaId: loja.id, dataReferencia: iso(new Date()), itens: [{ insumoId: insumo.id, qtdBase: 10 }] },
      })
      .then((r) => r.json());

    const getRes = await ctxB.get(`/api/contagens/${contagem.id}`);
    expect(getRes.status()).toBe(404);

    const putRes = await ctxB.put(`/api/contagens/${contagem.id}`, {
      headers: headersB,
      data: { dataReferencia: iso(new Date()), itens: [{ insumoId: insumo.id, qtdBase: 999 }] },
    });
    expect(putRes.status()).toBe(404);

    const deleteRes = await ctxB.delete(`/api/contagens/${contagem.id}`, { headers: headersB });
    expect(deleteRes.status()).toBe(404);

    // resultado da loja de A não é acessível via API de B (loja não é da conta B)
    const resultadoRes = await ctxB.get(
      `/api/resultado?lojaId=${loja.id}&dataInicio=${daysAgo(30)}&dataFim=${daysAgo(0)}`
    );
    expect(resultadoRes.status()).toBe(404);

    await ctxA.dispose();
    await ctxB.dispose();
  });

  test('contagem rejeita insumo de outra conta', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const ctxB = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });

    const csrfA = await signupAndGetCsrf(ctxA, 'Dono A3', randomEmail('a3'));
    const csrfB = await signupAndGetCsrf(ctxB, 'Dono B3', randomEmail('b3'));

    const insumoB = await ctxB
      .post('/api/insumos', {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfB },
        data: { nome: 'Insumo B3', unidadeBase: 'g' },
      })
      .then((r) => r.json());

    const lojaA = await ctxA
      .post('/api/lojas', {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfA },
        data: { nome: 'Loja A3' },
      })
      .then((r) => r.json());

    const contagemRes = await ctxA.post('/api/contagens', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfA },
      data: {
        lojaId: lojaA.id,
        dataReferencia: iso(new Date()),
        itens: [{ insumoId: insumoB.id, qtdBase: 10 }],
      },
    });
    expect(contagemRes.status()).toBe(400);

    await ctxA.dispose();
    await ctxB.dispose();
  });
});
