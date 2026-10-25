import {
  CATEGORIES,
  EventFormat,
  EventStatus,
  PlanCode,
  RegistrationStatus,
  Role,
  UserStatus,
  plan,
  subscription,
  type Entitlement,
} from '@gatherly/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamptz = () => timestamp({ withTimezone: true });
const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamptz().notNull().defaultNow();

export const roleEnum = pgEnum('role', Role.enum);
export const userStatusEnum = pgEnum('user_status', UserStatus.enum);
export const planCodeEnum = pgEnum('plan_code', PlanCode.enum);
export const planIntervalEnum = pgEnum('plan_interval', plan.shape.interval.enum);
export const subscriptionStatusEnum = pgEnum('subscription_status', subscription.shape.status.enum);
export const subscriptionProviderEnum = pgEnum(
  'subscription_provider',
  subscription.shape.provider.enum,
);
export const categoryEnum = pgEnum('category', CATEGORIES);
export const eventFormatEnum = pgEnum('event_format', EventFormat.enum);
export const eventStatusEnum = pgEnum('event_status', EventStatus.enum);
export const registrationStatusEnum = pgEnum('registration_status', RegistrationStatus.enum);

export const users = pgTable('users', {
  id: id(),
  email: text().notNull().unique(),
  name: text().notNull(),
  avatarUrl: text(),
  role: roleEnum().notNull().default('member'),
  status: userStatusEnum().notNull().default('active'),
  /** Seeded demo personas: cannot be suspended, demoted or downgraded. */
  isProtected: boolean().notNull().default(false),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 of the cookie token, so a leaked table cannot be replayed. */
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamptz().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
);

export const plans = pgTable('plans', {
  id: id(),
  code: planCodeEnum().notNull().unique(),
  name: text().notNull(),
  priceCents: integer().notNull(),
  interval: planIntervalEnum().notNull(),
  entitlements: text().array().$type<Entitlement[]>().notNull().default([]),
});

export const subscriptions = pgTable('subscriptions', {
  id: id(),
  userId: uuid()
    .notNull()
    .unique('subscriptions_user_id_unique')
    .references(() => users.id, { onDelete: 'cascade' }),
  planId: uuid()
    .notNull()
    .references(() => plans.id),
  status: subscriptionStatusEnum().notNull().default('active'),
  currentPeriodEnd: timestamptz(),
  provider: subscriptionProviderEnum().notNull(),
  providerRef: text(),
  createdAt: createdAt(),
});

export const events = pgTable(
  'events',
  {
    id: id(),
    organizerId: uuid()
      .notNull()
      .references(() => users.id),
    title: text().notNull(),
    summary: text().notNull(),
    description: text().notNull().default(''),
    category: categoryEnum().notNull(),
    format: eventFormatEnum().notNull(),
    venueName: text(),
    address: text(),
    city: text(),
    onlineUrl: text(),
    startsAt: timestamptz().notNull(),
    endsAt: timestamptz().notNull(),
    timezone: text().notNull(),
    capacity: integer().notNull(),
    registeredCount: integer().notNull().default(0),
    priceCents: integer().notNull().default(0),
    currency: text().notNull().default('USD'),
    status: eventStatusEnum().notNull().default('published'),
    coverImage: text().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamptz()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('events_starts_at_status_idx').on(t.startsAt, t.status),
    index('events_organizer_id_idx').on(t.organizerId),
    // Last line of defence against overbooking if a code path ever skips the conditional update.
    check(
      'events_registered_count_within_capacity',
      sql`${t.registeredCount} >= 0 and ${t.registeredCount} <= ${t.capacity}`,
    ),
  ],
);

export const registrations = pgTable(
  'registrations',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: registrationStatusEnum().notNull().default('confirmed'),
    holdExpiresAt: timestamptz(),
    createdAt: createdAt(),
    cancelledAt: timestamptz(),
  },
  (t) => [
    index('registrations_user_id_idx').on(t.userId),
    // One active registration per user and event; cancelled rows stay as history.
    uniqueIndex('registrations_active_event_user_idx')
      .on(t.eventId, t.userId)
      .where(sql`${t.status} in ('pending_payment', 'confirmed')`),
  ],
);
