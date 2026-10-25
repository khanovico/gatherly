import type { Persona } from '@gatherly/shared';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { createDb, type Db } from '../src/db/client';
import { ensurePersonas } from '../src/db/personas';
import { events, registrations, sessions, users } from '../src/db/schema';
import { runMigrations } from '../src/migrate';

type App = Awaited<ReturnType<typeof buildApp>>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** App on a migrated test database. Each test creates its own users and events, so nothing is truncated. */
export const startApp = async () => {
  const db = createDb(process.env.DATABASE_URL!);
  await runMigrations(db);
  await ensurePersonas(db);
  const app = await buildApp({ db });
  const close = () => app.close().then(() => db.$client.end());
  return { app, db, close };
};

/** Demo sign-in as a persona; returns its id and the cookie header to send. */
export const login = async (app: App, persona: Persona) => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/demo-login',
    payload: { persona },
  });
  return { userId: res.json().user.id as string, cookie: res.headers['set-cookie'] as string };
};

/** A fresh member with a session; returns the cookie header to send. */
export const signedInMember = async (db: Db) => {
  const [user] = await db
    .insert(users)
    .values({ email: `${randomUUID()}@test.gatherly`, name: 'Test Member' })
    .returning({ id: users.id });
  const token = randomBytes(32).toString('base64url');
  await db.insert(sessions).values({
    id: createHash('sha256').update(token).digest('hex'),
    userId: user!.id,
    expiresAt: new Date(Date.now() + DAY_MS),
  });
  return { userId: user!.id, cookie: `gatherly_session=${token}` };
};

/** A valid `POST /events` body, a week out. */
export const eventInput = (capacity = 20) => {
  const startsAt = Date.now() + 7 * DAY_MS;
  return {
    title: 'Test meetup',
    summary: 'A test event',
    description: '',
    category: 'tech',
    format: 'online',
    onlineUrl: 'https://example.com/meet',
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(startsAt + 2 * 60 * 60 * 1000).toISOString(),
    timezone: 'America/New_York',
    capacity,
  };
};

/** Inserts an event directly, for tests about what happens after creation. */
export const createEvent = async (
  db: Db,
  organizerId: string,
  capacity: number,
  overrides: Partial<typeof events.$inferInsert> = {},
) => {
  const startsAt = new Date(Date.now() + 7 * DAY_MS);
  const [event] = await db
    .insert(events)
    .values({
      organizerId,
      title: 'Test meetup',
      summary: 'A test event',
      category: 'tech',
      format: 'online',
      onlineUrl: 'https://example.com/meet',
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      capacity,
      coverImage: '/images/covers/tech-1.webp',
      ...overrides,
    })
    .returning();
  return event!;
};

/** The event's counter next to the confirmed rows it must always match. */
export const seatCounts = async (db: Db, eventId: string) => {
  const [event] = await db
    .select({ registeredCount: events.registeredCount })
    .from(events)
    .where(eq(events.id, eventId));
  const confirmed = await db.$count(
    registrations,
    and(eq(registrations.eventId, eventId), eq(registrations.status, 'confirmed')),
  );
  return { registeredCount: event!.registeredCount, confirmed };
};
