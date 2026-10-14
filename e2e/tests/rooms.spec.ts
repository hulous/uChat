import { expect, test } from '@playwright/test';
import { expectChatReady } from './helpers/chat';

test('creates a room and opens it from the rooms page', async ({ page, request }) => {
  const runId = Date.now();
  const email = `e2e-room-${runId}@example.com`;
  const password = 'Str0ngP@ssword';
  const roomName = `E2E room ${runId}`;
  const registration = await request.post('/api/auth/register', {
    data: { email, password, name: 'Room Owner' },
  });
  expect(registration.ok()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/chat$/);

  await page.getByRole('link', { name: 'Salons' }).click();
  await expect(page).toHaveURL(/\/chat\/rooms$/);
  await page.getByLabel('Nom du salon').fill(roomName);
  await page.getByRole('button', { name: 'Créer le salon' }).click();

  await expect(page).toHaveURL(/\/chat\/rooms\/[^/]+$/);
  await expect(page.getByRole('heading', { name: roomName, exact: true })).toBeVisible();
  await expectChatReady(page);

  await page.getByRole('link', { name: 'Salons' }).click();
  await expect(page).toHaveURL(/\/chat\/rooms$/);
  await expect(page.getByRole('button', { name: roomName, exact: true })).toBeVisible();
});
