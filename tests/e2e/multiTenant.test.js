import { test, expect } from '@playwright/test';
import { primeCsrf } from './helpers/csrf.js';

const randomEmail = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.com`;

const signup = async (request, nome, email, senha) => {
  const csrf = await primeCsrf(request);
  const res = await request.post('/auth/signup', {
    headers: { Accept: 'application/json', 'X-CSRF-Token': csrf },
    data: { nome, email, senha },
  });
  expect(res.status()).toBe(201);
  return res.headers()['set-cookie'];
};

test.describe('Multi-tenant Isolation', () => {
  test('conta B não acessa loja criada pela conta A', async ({ playwright }) => {
    const contextA = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const contextB = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });

    await signup(contextA, 'Dono A', randomEmail('a'), 'SenhaForte123');
    await signup(contextB, 'Dono B', randomEmail('b'), 'SenhaForte123');

    const stateA = await contextA.storageState();
    const tokenA = stateA.cookies.find((c) => c.name === 'csrf_token')?.value;

    const lojaRes = await contextA.post('/api/lojas', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': tokenA },
      data: { nome: 'Loja da Conta A', cidade: 'Fortaleza' },
    });
    expect(lojaRes.status()).toBe(201);
    const loja = await lojaRes.json();

    const acessoB = await contextB.get(`/api/lojas/${loja.id}`);
    expect(acessoB.status()).toBe(404);

    const listaB = await contextB.get('/api/lojas');
    expect(listaB.status()).toBe(200);
    const lojasB = await listaB.json();
    expect(lojasB.find((l) => l.id === loja.id)).toBeUndefined();

    await contextA.dispose();
    await contextB.dispose();
  });

  test('API sem sessão retorna 401 em vez de redirecionar', async ({ request }) => {
    const response = await request.get('/api/lojas', {
      headers: { Accept: 'application/json' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(401);
  });

  test('sessão isola cookies entre contextos de browser', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');

    const cookie1 = await page1.context().cookies();
    const cookie2 = await page2.context().cookies();

    const session1 = cookie1.find((c) => c.name === 'connect.sid');
    const session2 = cookie2.find((c) => c.name === 'connect.sid');

    if (session1 && session2) {
      expect(session1.value).not.toBe(session2.value);
    }

    await context1.close();
    await context2.close();
  });
});
