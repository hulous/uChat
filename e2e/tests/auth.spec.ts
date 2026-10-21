import { expect, test } from '@playwright/test';

test('redirects unauthenticated visitors to login', async ({ page }) => {
  await page.goto('/chat');

  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fchat$/);
  await expect(page.getByRole('heading', { name: 'Bon retour.' })).toBeVisible();
});

test('rejects invalid credentials without opening the chat', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Adresse email').fill(`missing-${Date.now()}@example.com`);
  await page.getByLabel('Mot de passe').fill('WrongP@ssword');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Adresse email ou mot de passe incorrect.',
  );
  await expect(page).toHaveURL(/\/login$/);
});

test('keeps registration disabled until required fields are valid', async ({ page }) => {
  await page.goto('/register');

  const submit = page.getByRole('button', { name: 'Créer mon compte' });
  await expect(submit).toBeDisabled();

  await page.getByLabel('Nom').fill('E2E User');
  await page.getByLabel('Adresse email').fill('not-an-email');
  await page.getByLabel('Mot de passe').fill('short');
  await expect(submit).toBeDisabled();

  await page.getByLabel('Adresse email').fill('valid@example.com');
  await page.getByLabel('Mot de passe').fill('Str0ngP@ssword');
  await expect(submit).toBeEnabled();
});

test('registers through the API, logs in, and opens the chat', async ({ page, request }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Str0ngP@ssword';

  const registration = await request.post('/api/auth/register', {
    data: { email, password, name: 'E2E User' },
  });
  expect(registration.ok()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/chat\/rooms$/);
  await expect(page.getByRole('heading', { name: 'Vos salons', exact: true })).toBeVisible();
});

test('logs out and protects the chat again', async ({ page, request }) => {
  const email = `e2e-logout-${Date.now()}@example.com`;
  const password = 'Str0ngP@ssword';
  const registration = await request.post('/api/auth/register', {
    data: { email, password, name: 'Logout User' },
  });
  expect(registration.ok()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/chat\/rooms$/);

  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/chat');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fchat$/);
});
