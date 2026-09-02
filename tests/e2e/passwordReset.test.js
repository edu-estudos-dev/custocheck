import { test, expect } from '@playwright/test';

const randomEmail = () => `reset-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.com`;

test.describe('Password Reset', () => {
  test('fluxo completo: esqueci senha -> resetar -> login com senha nova', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const email = randomEmail();

    const signupRes = await ctx.post('/auth/signup', {
      headers: { Accept: 'application/json' },
      data: { nome: 'Usuário Reset', email, senha: 'SenhaOriginal1' },
    });
    expect(signupRes.status()).toBe(201);

    const forgotRes = await ctx.post('/auth/esqueci-senha', {
      headers: { Accept: 'application/json' },
      data: { email },
    });
    expect(forgotRes.status()).toBe(200);
    const forgotBody = await forgotRes.json();
    expect(forgotBody.devResetUrl).toBeTruthy();

    const token = new URL(forgotBody.devResetUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    const resetRes = await ctx.post('/auth/resetar-senha', {
      headers: { Accept: 'application/json' },
      data: { token, senha: 'SenhaNova2' },
    });
    expect(resetRes.status()).toBe(200);

    // token de uso único: reutilizar deve falhar
    const reuseRes = await ctx.post('/auth/resetar-senha', {
      headers: { Accept: 'application/json' },
      data: { token, senha: 'OutraSenha3' },
    });
    expect(reuseRes.status()).toBe(400);

    // senha antiga não funciona mais
    const oldLoginRes = await ctx.post('/auth/login', {
      headers: { Accept: 'application/json' },
      data: { email, senha: 'SenhaOriginal1' },
    });
    expect(oldLoginRes.status()).toBe(401);

    // senha nova funciona
    const newLoginRes = await ctx.post('/auth/login', {
      headers: { Accept: 'application/json' },
      data: { email, senha: 'SenhaNova2' },
    });
    expect(newLoginRes.status()).toBe(200);

    await ctx.dispose();
  });

  test('esqueci-senha não revela se o email existe', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });

    const res = await ctx.post('/auth/esqueci-senha', {
      headers: { Accept: 'application/json' },
      data: { email: 'nao-existe-' + Date.now() + '@teste.com' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBeTruthy();
    expect(body.devResetUrl).toBeUndefined();

    await ctx.dispose();
  });
});
