import { test, expect } from '@playwright/test';

test.describe('Candidate Assessment Full Lifecycle E2E', () => {

  test('Candidate should see portal, enter PIN, or launch practice arena', async ({ page }) => {
    // 1. Visit Portal Root
    await page.goto('/');

    // 2. Candidate login form should be rendered
    const pinInput = page.locator('input[name="examPin"]');
    await expect(pinInput).toBeVisible();

    // 3. Practice Arena link should be active and navigable
    const practiceLink = page.getByRole('link', { name: /Practice Arena/i });
    await expect(practiceLink).toBeVisible();

    await practiceLink.click();
    await expect(page).toHaveURL(/.*practice/);
    await expect(page.getByText('Adaptive Practice Mode')).toBeVisible();

    // 4. Launch a 5-question practice drill
    const launchBtn = page.getByRole('button', { name: /Launch Practice Session/i });
    await launchBtn.click();

    // 5. Question stem and options rendered
    await expect(page.getByText(/Practice Q1 of/i)).toBeVisible();
  });

  test('Examiner Login boundary rejects unauthorized paths', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByText('Examiner Access')).toBeVisible();

    // Fill invalid credentials
    await page.fill('input[name="email"]', 'intruder@unknown.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Warning message displayed
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  });
});
