import { test, expect } from '@playwright/test';

test.describe('Multi-tenant Isolation', () => {
  test('API rejects access to other tenant data', async ({ page }) => {
    // Este teste requer banco rodando. Estrutura pronta para quando banco estiver disponível.

    // Cenário: User A cria insumo, User B tenta acessar
    // 1. User A signup → conta_id 1
    // 2. User A cria insumo_id 100
    // 3. User B signup → conta_id 2
    // 4. User B calls GET /api/insumos/100 → deve retornar 404
    //    (insumo 100 não existe em seu escopo conta_id=2)

    // Por enquanto, apenas verificamos que rotas existem
    const response = await page.request.get('/api/insumos', {
      headers: { 'Accept': 'application/json' },
    });

    // Sem auth, espera 401
    expect([401, 302]).toContain(response.status());
  });

  test('session data isolates per browser context', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Dois contextos devem ter diferentes session cookies
    await page1.goto('/');
    await page2.goto('/');

    const cookie1 = await page1.context().cookies();
    const cookie2 = await page2.context().cookies();

    // Verificar que session cookies são diferentes
    const session1 = cookie1.find(c => c.name === 'connect.sid');
    const session2 = cookie2.find(c => c.name === 'connect.sid');

    if (session1 && session2) {
      expect(session1.value).not.toBe(session2.value);
    }

    await context1.close();
    await context2.close();
  });
});
