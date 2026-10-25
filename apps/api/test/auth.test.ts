import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

const post = (url: string, payload: object) =>
  ctx.app.inject({ method: 'POST', url: `/api/v1/auth/${url}`, payload });

it('signs up, signs in with the password, and rejects bad or duplicate credentials', async () => {
  const email = `${randomUUID()}@test.gatherly`;
  const account = { name: 'New Member', email, password: 'correct horse' };

  const signup = await post('signup', { ...account, email: email.toUpperCase() });
  expect(signup.statusCode).toBe(201);
  expect(signup.json()).toMatchObject({ user: { email }, plan: 'free', onboardingPending: true });
  const me = await ctx.app.inject({
    url: '/api/v1/me',
    headers: { cookie: signup.headers['set-cookie'] as string },
  });
  expect(me.json().user.email).toBe(email);

  const duplicate = await post('signup', account);
  expect([duplicate.statusCode, duplicate.json().code]).toEqual([409, 'EMAIL_TAKEN']);

  for (const wrong of [
    { email, password: 'wrong horse' },
    { email: 'nobody@test.gatherly', password: 'x' },
  ]) {
    const res = await post('signin', wrong);
    expect([res.statusCode, res.json().code]).toEqual([401, 'INVALID_CREDENTIALS']);
  }

  const signin = await post('signin', { email, password: account.password });
  expect(signin.statusCode).toBe(200);
  expect(signin.headers['set-cookie']).toContain('gatherly_session=');
});

it('limits sign-in per account across IPs and ignores a forged X-Forwarded-For', async () => {
  const attempt = (email: string, from: { remoteAddress: string; forwardedFor?: string }) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/signin',
      remoteAddress: from.remoteAddress,
      headers: from.forwardedFor ? { 'x-forwarded-for': from.forwardedFor } : {},
      payload: { email, password: 'wrong horse' },
    });

  const target = `${randomUUID()}@test.gatherly`;
  for (let i = 1; i <= 10; i++) await attempt(target, { remoteAddress: `10.1.0.${i}` });
  expect((await attempt(target, { remoteAddress: '10.1.0.11' })).statusCode).toBe(429);

  for (let i = 1; i <= 10; i++) {
    await attempt(`${randomUUID()}@test.gatherly`, { remoteAddress: '10.2.0.1' });
  }
  const forged = await attempt(`${randomUUID()}@test.gatherly`, {
    remoteAddress: '10.2.0.1',
    forwardedFor: '203.0.113.7',
  });
  expect(forged.statusCode).toBe(429);
});

it('answers wrong method, oversized and non-JSON bodies with their own codes', async () => {
  const outcome = (res: Awaited<ReturnType<typeof post>>) => [res.statusCode, res.json().code];
  const wrongMethod = await ctx.app.inject({ method: 'GET', url: '/api/v1/auth/signin' });
  expect(outcome(wrongMethod)).toEqual([405, 'METHOD_NOT_ALLOWED']);
  expect(wrongMethod.headers.allow).toBe('POST');
  expect(outcome(await post('signin', { email: 'x'.repeat(2_000_000) }))).toEqual([
    413,
    'PAYLOAD_TOO_LARGE',
  ]);
  const text = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/signin',
    headers: { 'content-type': 'application/xml' },
    payload: '<hi/>',
  });
  expect(outcome(text)).toEqual([415, 'UNSUPPORTED_MEDIA_TYPE']);
});
