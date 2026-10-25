import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { createDb, type Db } from '../src/db/client';
import { ensurePersonas } from '../src/db/personas';
import { events, registrations, sessions, users } from '../src/db/schema';
import { runMigrations } from '../src/migrate';

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

export const createEvent = async (db: Db, organizerId: string, capacity: number) => {
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
