import { afterAll, beforeAll, expect, it } from 'vitest';
import { createEvent, signedInMember, startApp } from './setup';

let ctx: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(() => ctx.close());

it('saves idempotently, lists saved events and unsaves', async () => {
  const member = await signedInMember(ctx.db);
  const event = await createEvent(ctx.db, member.userId, 10);
  const call = (method: 'PUT' | 'DELETE' | 'GET', url: string) =>
    ctx.app.inject({ method, url: `/api/v1${url}`, headers: { cookie: member.cookie } });

  expect((await call('PUT', `/events/${event.id}/save`)).statusCode).toBe(204);
  expect((await call('PUT', `/events/${event.id}/save`)).statusCode).toBe(204);
  const saved = (await call('GET', '/me/saved')).json();
  expect([saved.total, saved.items[0].id, saved.items[0].saved]).toEqual([1, event.id, true]);

  expect((await call('DELETE', `/events/${event.id}/save`)).statusCode).toBe(204);
  expect((await call('GET', '/me/saved')).json().total).toBe(0);

  expect((await call('PUT', `/events/${event.id}/hide`)).statusCode).toBe(204);
  const missing = await call('PUT', `/events/${crypto.randomUUID()}/hide`);
  expect([missing.statusCode, missing.json().code]).toEqual([404, 'NOT_FOUND']);
});
