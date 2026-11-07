import { test, expect } from '@playwright/test';
import { demoUser, login, mockBackend, token } from './fixtures';

test('login validates on Enter, rejects malformed sessions, and persists a remembered profile', async ({ page }) => {
  const api = await mockBackend(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  expect(api.loginCalls).toBe(0);
  await page.getByLabel('Email', { exact: true }).fill(demoUser.email);
  await page.getByLabel('Password', { exact: true }).fill(demoUser.password);
  api.invalidLogin = true;
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('dashboardSession'))).toBeNull();
  api.invalidLogin = false;
  await page.getByLabel('Remember me').check();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.reload();
  await expect(page.getByText(demoUser.fullname, { exact: true })).toBeVisible();
  expect(api.loginCalls).toBe(2);
  expect(await page.evaluate(() => !!localStorage.getItem('dashboardSession'))).toBe(true);
});

test('signup validates, submits email preference, reports server errors, and links to login', async ({ page }) => {
  const api = await mockBackend(page);
  await page.goto('/login');
  await page.getByRole('link', { name: 'Sign up', exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page.getByText('Name is required.')).toBeVisible();
  expect(api.signupCalls).toBe(0);
  await page.getByLabel('Full name').fill('New User');
  await page.getByLabel('Email', { exact: true }).fill('new@example.test');
  await page.getByLabel('Password', { exact: true }).fill(demoUser.password);
  await page.getByLabel('I want to receive updates via email.').check();
  api.failSignup = true;
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Creating account…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveText('This email is already registered.');
  expect(api.signupBody.updateinmail).toBe(true);
  api.failSignup = false;
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('mobile navigation changes views, closes the drawer, and logs out', async ({ page }) => {
  await mockBackend(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'menu', exact: true }).click();
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
  await expect(page.getByText('Jamie Chen', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logout' })).not.toBeVisible();
  await page.getByRole('button', { name: 'menu', exact: true }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem('dashboardSession'))).toBeNull();
});

test('expired sessions redirect and API 401 responses clear the session', async ({ page }) => {
  const api = await mockBackend(page);
  await page.goto('/login');
  await page.evaluate((accessToken) => localStorage.setItem('dashboardSession', JSON.stringify({
    accessToken, refreshToken: 'test', fullname: 'Expired User', email: 'expired@example.test',
  })), token(Date.now() - 10_000));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  api.unauthorized = true;
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem('dashboardSession'))).toBeNull();
});

test('an open dashboard signs out when its access token expires', async ({ page }) => {
  await mockBackend(page);
  await page.clock.install();
  await login(page);
  await page.clock.fastForward(3_600_100);
  await expect(page).toHaveURL(/\/login$/);
});

test('customer pagination loads the next server page', async ({ page }) => {
  const api = await mockBackend(page);
  api.customers = Array.from({ length: 23 }, (_, index) => ({
    ...api.customers[0], customerId: `customer-${index}`, customerName: `Customer ${index + 1}`,
  }));
  await login(page);
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await expect(page.getByText('Customer 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go to next page' }).click();
  await expect(page.getByText('Customer 11', { exact: true })).toBeVisible();
  await expect(page.getByText('Customer 1', { exact: true })).not.toBeVisible();
});

test('customers retry loading, persist edits/creation, and preserve rows after failed deletion', async ({ page }) => {
  const api = await mockBackend(page);
  await login(page);
  api.failLoad = true;
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Customer service is unavailable.');
  api.failLoad = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  const row = page.locator('[role="row"][data-id="11111111-1111-4111-8111-111111111111"]');
  await row.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await row.locator('[data-field="customerName"] input').fill('Jamie Updated');
  api.failSave = true;
  await row.getByRole('menuitem', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Save failed.');
  expect(api.customers[0].customerName).toBe('Jamie Chen');
  api.failSave = false;
  await row.getByRole('menuitem', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Jamie Updated', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await expect(page.getByText('Jamie Updated', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add customer' }).click();
  const newRow = page.locator('[role="row"][data-id^="new-"]');
  const values = { customerName: 'Avery Test', cemail: 'avery@example.test', phone: '+14155550123',
    address: '16 Test Street', city: 'Seattle', postalCode: '98101', country: 'United States' };
  // Scroll each cell into view because the grid virtualizes columns.
  for (const [field, value] of Object.entries(values)) {
    await page.locator('.MuiDataGrid-virtualScroller').evaluate((element) => { element.scrollLeft = 0; });
    if (['city', 'postalCode', 'country'].includes(field)) {
      await page.locator('.MuiDataGrid-virtualScroller').evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    }
    await newRow.locator(`[data-field="${field}"] input`).fill(value);
  }
  await newRow.getByRole('menuitem', { name: 'Save', exact: true }).click();
  await expect.poll(() => api.createCalls).toBe(1);
  await expect(page.getByText('Avery Test', { exact: true })).toBeVisible();
  const savedRow = page.getByRole('row').filter({ hasText: 'Avery Test' });
  api.failDelete = true;
  await savedRow.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete customer', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Delete failed.');
  await expect(page.getByText('Avery Test', { exact: true })).toBeVisible();
  api.failDelete = false;
  await savedRow.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete customer', exact: true }).click();
  await expect(page.getByText('Avery Test', { exact: true })).not.toBeVisible();
  expect(api.customers.some((customer) => customer.customerName === 'Avery Test')).toBe(false);
});
