import type { Page, Route } from '@playwright/test';

export const demoUser = { fullname: 'Alex Morgan', email: 'alex@example.test', password: 'DemoPass123!' };
export const token = (expires = Date.now() + 3_600_000) =>
  `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(expires / 1000), sub: 'demo-user' })).toString('base64url')}.test-signature`;

export const demoCustomers = [
  { customerId: '11111111-1111-4111-8111-111111111111', customerName: 'Jamie Chen', cemail: 'jamie@example.test', phone: '+14155550101', address: '12 Cedar Lane', city: 'San Francisco', postalCode: '94107', country: 'United States' },
  { customerId: '22222222-2222-4222-8222-222222222222', customerName: 'Sam Rivera', cemail: 'sam@example.test', phone: '+442079460101', address: '24 Maple Street', city: 'London', postalCode: 'SW1A 1AA', country: 'United Kingdom' },
  { customerId: '33333333-3333-4333-8333-333333333333', customerName: 'Taylor Brooks', cemail: 'taylor@example.test', phone: '+61255500101', address: '8 Park Avenue', city: 'Sydney', postalCode: '2000', country: 'Australia' },
];

export async function mockBackend(page: Page) {
  const state = {
    customers: structuredClone(demoCustomers),
    loginCalls: 0, signupCalls: 0, createCalls: 0,
    failLoad: false, failSave: false, failDelete: false, unauthorized: false,
    invalidLogin: false, failSignup: false, signupBody: {} as Record<string, unknown>,
  };
  await page.route('http://localhost:3000/v1/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const reply = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    if (url.pathname.endsWith('/auth/login')) {
      state.loginCalls++;
      await new Promise((resolve) => setTimeout(resolve, 180));
      return reply(state.invalidLogin ? { fullname: demoUser.fullname } : {
        access_token: token(), refresh_token: 'test-refresh-token', fullname: demoUser.fullname,
      });
    }
    if (url.pathname.endsWith('/users')) {
      state.signupCalls++;
      state.signupBody = request.postDataJSON();
      await new Promise((resolve) => setTimeout(resolve, 180));
      return state.failSignup ? reply({ message: 'This email is already registered.' }, 409) : reply({ id: 'test-user' }, 201);
    }
    if (state.unauthorized) return reply({ message: 'Session expired' }, 401);
    if (!request.headers().authorization?.startsWith('Bearer ')) return reply({ message: 'Missing token' }, 401);
    const id = url.pathname.split('/customers/')[1];
    if (request.method() === 'GET') {
      if (state.failLoad) return reply({ message: 'Customer service is unavailable.' }, 503);
      if (id) return reply(state.customers.find((customer) => customer.customerId === id));
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || 10);
      return reply({ items: state.customers.slice(offset, offset + limit), total: state.customers.length });
    }
    if (request.method() === 'DELETE') {
      if (state.failDelete) return reply({ message: 'Delete failed. Please retry.' }, 500);
      state.customers = state.customers.filter((customer) => customer.customerId !== id);
      return route.fulfill({ status: 204 });
    }
    if (state.failSave) return reply({ message: 'Save failed. Please retry.' }, 500);
    if (request.method() === 'PATCH') {
      const customer = state.customers.find((customer) => customer.customerId === id)!;
      Object.assign(customer, request.postDataJSON());
      return reply(customer);
    }
    if (request.method() === 'POST') {
      state.createCalls++;
      const customer = { ...request.postDataJSON(), customerId: crypto.randomUUID() };
      state.customers.push(customer);
      return reply(customer, 201);
    }
    return reply({ message: 'Not found' }, 404);
  });
  return state;
}

export async function login(page: Page, remember = false) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(demoUser.email);
  await page.getByLabel('Password', { exact: true }).fill(demoUser.password);
  if (remember) await page.getByLabel('Remember me').check();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
}
