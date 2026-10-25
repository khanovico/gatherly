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
  expect(signup.statusCode).toBe(200);
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
