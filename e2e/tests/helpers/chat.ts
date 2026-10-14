import { expect, type Page } from '@playwright/test';

export const CHAT_INITIALIZATION_TIMEOUT = 30000;
export const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:4250';

export async function expectChatReady(page: Page) {
  const messageLog = page.getByRole('log', { name: 'Messages du tchat' });
  const loadingMessage = messageLog.getByText('Chargement des messages...', {
    exact: true,
  });

  await expect(messageLog).toBeVisible();
  await expect(loadingMessage).toBeVisible();
  await expect(loadingMessage).toBeHidden({
    timeout: CHAT_INITIALIZATION_TIMEOUT,
  });

  return messageLog;
}
