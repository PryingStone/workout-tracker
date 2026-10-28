import { test, expect } from '@playwright/test';
test('register, track, edit, schedule, reminders, chart, logout and login', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const email = `demo-${Date.now()}@example.com`;
  await page.goto('/');
  await page
    .getByRole('button', { name: 'New here? Create an account' })
    .click();
  await page.getByLabel('Your name', { exact: true }).fill('Asha');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('college-demo-123');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page.getByText('Hey, Asha')).toBeVisible();
  await expect(page.getByText('Your story starts here')).toBeVisible();
  await page
    .getByRole('button', { name: 'Daily check-in', exact: true })
    .click();
  await page
    .getByLabel('Total steps for this day', { exact: true })
    .fill('5200');
  await page.getByLabel('Weight (kg)', { exact: true }).fill('60');
  await page
    .getByLabel('Measured heart rate (bpm)', { exact: true })
    .fill('72');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('5,200', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log workout', exact: true }).click();
  await page
    .getByLabel('Workout name', { exact: true })
    .fill('Morning strength');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByText('Morning strength', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Workouts', exact: true }).click();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Squat');
  await page.getByLabel('Weight (kg)', { exact: true }).fill('40');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Squat', { exact: true })).toBeVisible();
  await page.getByLabel('Edit Morning strength', { exact: true }).click();
  await page.getByLabel('Duration (minutes)', { exact: true }).fill('45');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText(/45 min/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Schedule session', exact: true })
    .click();
  await page.getByLabel('Workout name', { exact: true }).fill('Evening walk');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Evening walk', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
  await page
    .getByLabel('Target (steps, minutes or sessions)', { exact: true })
    .fill('5000');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByText('daily steps: 5,000', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add reminder', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Time to move', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Enable device notifications', exact: true })
    .click();
  await expect(
    page.getByText(
      'Local notifications require the iOS or Android app on a supported device.',
    ),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Progress', exact: true }).click();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Weight', exact: true }).click();
  await page.getByRole('button', { name: /60/ }).first().click();
  await expect(page.getByText(/60 kg/).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Workouts', exact: true }).click();
  await page.getByLabel('Delete Morning strength', { exact: true }).click();
  await page.getByRole('button', { name: 'Delete item', exact: true }).click();
  await expect(page.getByText('Morning strength', { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('college-demo-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('5,200', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/dashboard-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('tab', { name: 'Home', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/dashboard-mobile.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Daily check-in', exact: true })
    .click();
  await page
    .getByLabel('Total steps for this day', { exact: true })
    .fill('5400');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('5,400', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
