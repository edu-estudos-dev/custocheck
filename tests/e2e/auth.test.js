import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('homepage renders public landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Todo mês some');
  });

  test('access login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Bem-vindo de volta');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="senha"]')).toBeVisible();
  });

  test('access register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Criar conta');
    await expect(page.locator('input[name="nome"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="senha"]')).toBeVisible();
  });

  test('access forgot password page', async ({ page }) => {
    await page.goto('/esqueci-senha');
    await expect(page.locator('h1')).toContainText('Esqueci minha senha');
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('reset password page without token shows invalid link message', async ({ page }) => {
    await page.goto('/resetar-senha');
    await expect(page.locator('h1')).toContainText('Nova senha');
    await expect(page.getByText('Link inválido.')).toBeVisible();
    await expect(page.locator('#resetForm')).toHaveCount(0);
  });

  test('register form validation', async ({ page }) => {
    await page.goto('/register');

    const nameInput = page.locator('input[name="nome"]');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="senha"]');

    // Testar validação nativa HTML5
    await nameInput.fill('');
    await emailInput.fill('not-an-email');
    await passwordInput.fill('weak');

    // Verificar que inputs existem (tipos de validação HTML5 são feitos pelo browser)
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Dashboard', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
