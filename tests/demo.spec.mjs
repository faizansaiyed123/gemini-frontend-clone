import { expect, test } from '@playwright/test';

async function signIn(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).first().click();
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByRole('button', { name: /send sign-in code/i }).click();
  await expect(page.getByText('246810')).toBeVisible();
  await page.getByLabel('6-digit verification code').fill('246810');
  await page.getByRole('button', { name: /verify and continue/i }).click();
  await expect(page.getByText('What’s on your mind?')).toBeVisible();
}

test('demo login, conversation, asynchronous response, and persisted history', async ({ page }) => {
  await signIn(page);

  await expect(page.getByText('A quick tour of your workspace')).toBeVisible();
  await expect(page.getByText('DEMO · Browser only')).toBeVisible();

  const composer = page.getByRole('textbox', { name: 'Message Gemini' });
  await composer.fill('Explain how RAG works in an AI application');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByText('Explain how RAG works in an AI application')).toBeVisible();
  await expect(
    page.getByText(/Retrieval-Augmented Generation \(RAG\)/),
  ).toBeVisible({ timeout: 12_000 });

  await page.reload();
  await expect(page.getByText('Explain how RAG works in an AI application')).toBeVisible();
  await expect(
    page.getByText(/Retrieval-Augmented Generation \(RAG\)/),
  ).toBeVisible();
});

test('reset demo clears the local session and returns to the landing page', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('gemini_token')))
    .toBeNull();
});
