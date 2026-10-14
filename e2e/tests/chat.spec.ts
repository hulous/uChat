import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { BASE_URL, CHAT_INITIALIZATION_TIMEOUT } from './helpers/chat';

test('delivers a message from one user to another in real time', async ({
  browser,
  request,
}) => {
  const runId = `${Date.now()}`;
  const users = [
    { email: `e2e-sender-${runId}@example.com`, name: 'E2E Sender' },
    { email: `e2e-receiver-${runId}@example.com`, name: 'E2E Receiver' },
  ];
  const password = 'Str0ngP@ssword';
  const message = `Message temps réel ${runId}`;
  const database = new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });
  const contexts: import('@playwright/test').BrowserContext[] = [];

  try {
    for (const user of users) {
      const registration = await request.post('/api/auth/register', {
        data: { ...user, password },
      });
      expect(registration.ok()).toBeTruthy();
    }

    const senderContext = await browser.newContext({ baseURL: BASE_URL });
    contexts.push(senderContext);
    const receiverContext = await browser.newContext({ baseURL: BASE_URL });
    contexts.push(receiverContext);
    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    for (const [page, user] of [
      [senderPage, users[0]],
      [receiverPage, users[1]],
    ] as const) {
      const login = await request.post('/api/auth/login', {
        data: { email: user.email, password },
      });
      expect(login.ok()).toBeTruthy();
      const { token, expiresIn } = (await login.json()) as {
        token: string;
        expiresIn: number;
      };

      await page.addInitScript(
        ({ token: authenticationToken, expiresIn: authenticationDuration, email }) => {
          localStorage.setItem(
            'uchat.authentication',
            JSON.stringify({
              token: authenticationToken,
              expiresIn: authenticationDuration,
              email,
              expiresAt: Date.now() + authenticationDuration,
            }),
          );
        },
        { token, expiresIn, email: user.email },
      );
      await page.goto('/chat');
      await expect(page).toHaveURL(/\/chat$/);
      await expect(page.getByRole('log', { name: 'Messages du tchat' })).toBeVisible();
    }

    await senderPage.getByRole('textbox', { name: 'Message' }).fill(message);
    await senderPage.getByRole('button', { name: 'Envoyer' }).click();

    await expect(receiverPage.getByRole('log', { name: 'Messages du tchat' })).toContainText(
      message,
      { timeout: CHAT_INITIALIZATION_TIMEOUT },
    );
  } finally {
    try {
      await Promise.all(contexts.map((context) => context.close()));
    } finally {
      try {
        await database.query('DELETE FROM chat_message WHERE content = $1', [message]);
      } finally {
        await database.end();
      }
    }
  }
});
