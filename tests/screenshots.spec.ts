import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { login, mockBackend } from './fixtures';

for (const theme of ['light', 'dark'] as const) {
test(`capture ${theme} application screens and compose the README preview`, async ({ page, browser }) => {
  const suffix = theme === 'dark' ? '-dark' : '';
  await page.emulateMedia({ colorScheme: theme });
  test.setTimeout(90_000);
  const directory = resolve('docs/screenshots');
  await mkdir(directory, { recursive: true });
  await mockBackend(page);
  const capture = async (name: string) => {
    await expect(page.locator('html')).toHaveAttribute('data-mui-color-scheme', theme);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      const urls = new Set<string>();
      for (const element of document.querySelectorAll('*')) {
        const background = getComputedStyle(element).backgroundImage;
        for (const match of background.matchAll(/url\(["']?(.*?)["']?\)/g)) urls.add(match[1]);
      }
      await Promise.all([...urls].map((url) => new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = image.onerror = () => resolve();
        image.src = url;
      })));
    });
    await page.screenshot({ path: resolve(directory, `${name}${suffix}.png`), animations: 'disabled' });
  };

  await page.setViewportSize({ width: 1440, height: 780 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Our latest products' })).toBeVisible();
  await capture('marketing');
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await capture('login');
  await page.setViewportSize({ width: 1600, height: 780 });
  await login(page);
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await expect(page.getByText('Jamie Chen', { exact: true })).toBeVisible();
  await capture('customers');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  await capture('mobile');

  // Compose the untouched screenshots in HTML, then capture that layout.
  // This keeps the README image faithful to the actual rendered app.
  const source = async (name: string) => `data:image/png;base64,${(await readFile(resolve(directory, `${name}${suffix}.png`))).toString('base64')}`;
  const [marketing, customers, signin, mobile] = await Promise.all(['marketing', 'customers', 'login', 'mobile'].map(source));
  const board = await browser.newPage({ viewport: { width: 2000, height: 1632 }, deviceScaleFactor: 1 });
  await board.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}body{margin:0;background:#edf2f8;color:#16243b;font-family:Arial,sans-serif;padding:56px}
    header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:34px}
    .eyebrow{font-size:14px;font-weight:700;letter-spacing:3px;color:#1769d5;margin:0 0 14px}
    h1{font-size:48px;letter-spacing:-2px;margin:0 0 14px}header p{font-size:20px;color:#5a6c82;margin:0}
    .stack{font-size:14px;border:1px solid #d1dce9;border-radius:24px;padding:13px 20px;white-space:nowrap;background:white}
    .grid{display:grid;grid-template-columns:1320px 540px;gap:28px}
    .column{display:flex;flex-direction:column;gap:28px}.card{background:#fff;border:1px solid #d4dfea;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px #1733530c}
    .label{padding:17px 22px;border-bottom:1px solid #e2e9f1;display:flex;align-items:center;justify-content:space-between;font-size:17px;font-weight:700}
    .label span{font-size:13px;font-weight:400;color:#64748b}.desktop img{display:block;width:100%;height:auto}
    .auth img{display:block;width:100%;height:675px;object-fit:contain;background:#f9fbff}
    .phone{padding:18px;background:#e8eef7;display:flex;justify-content:center}.phone img{height:492px;width:auto;border:6px solid #1b2b44;border-radius:23px;box-shadow:0 10px 22px #152c4a25}
    footer{display:flex;justify-content:space-between;margin-top:26px;font-size:15px;color:#62748c}
    ${theme === 'dark' ? `
      body{background:#090f1c;color:#e5edf9}
      .eyebrow{color:#78aaff}header p{color:#9bacc3}
      .stack{background:#121e31;border-color:#2a3b53;color:#c6d6ec}
      .card{background:#101a2b;border-color:#29384e;box-shadow:0 12px 32px #0003}
      .label{border-color:#29384e}.label span{color:#9aadc8}
      .auth img{background:#080b12}.phone{background:#0b1423}
      .phone img{border-color:#334562;box-shadow:0 10px 22px #0006}
      footer{color:#99acc6}
    ` : ''}
  </style></head><body>
    <header><div><p class="eyebrow">TYPESCRIPT 0 TO 1</p><h1>React Dashboard</h1><p>Marketing, authentication, and customer management — across screen sizes.</p></div><div class="stack">React 18 · TypeScript · Material UI · Vite</div></header>
    <div class="grid"><div class="column">
      <section class="card desktop"><div class="label">01 / Marketing website<span>Desktop · ${theme === 'dark' ? 'Dark' : 'Light'} theme</span></div><img src="${marketing}"></section>
      <section class="card desktop"><div class="label">02 / Customer management<span>API-backed grid · Fixture records shown</span></div><img src="${customers}"></section>
    </div><div class="column">
      <section class="card auth"><div class="label">03 / Sign in<span>Validated forms</span></div><img src="${signin}"></section>
      <section class="card"><div class="label">04 / Mobile navigation<span>390 px viewport</span></div><div class="phone"><img src="${mobile}"></div></section>
    </div></div>
    <footer><span>Actual browser screenshots · No generated interface elements</span><span>Demo identity and customer records use mocked API responses.</span></footer>
  </body></html>`);
  await board.locator('img').evaluateAll((images) => Promise.all(images.map((img) => (img as HTMLImageElement).decode())));
  await board.screenshot({ path: resolve(directory, `project-preview${suffix}.png`), fullPage: true });
  await board.close();
});

}
