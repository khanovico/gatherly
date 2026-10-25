import {
  CATEGORIES,
  EventFormat,
  EventStatus,
  InteractionType,
  PlanCode,
  RegistrationStatus,
  Role,
  UserStatus,
  plan,
  subscription,
  type Category,
  type Entitlement,
  type NeighborhoodId,
  type Surface,
  type TimeSlot,
} from '@gatherly/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamptz = () => timestamp({ withTimezone: true });
const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamptz().notNull().defaultNow();
const updatedAt = () =>
  timestamptz()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

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
export const interactionTypeEnum = pgEnum('interaction_type', InteractionType.enum);

export const users = pgTable('users', {
  id: id(),
  email: text().notNull().unique(),
  name: text().notNull(),
  avatarUrl: text(),
  /** argon2id; null for accounts that cannot sign in with a password (demo personas). */
  passwordHash: text(),
  bio: text(),
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
    /** Null for online events. */
    lat: doublePrecision(),
    lng: doublePrecision(),
    neighborhood: text().$type<NeighborhoodId>(),
    tags: text().array().notNull().default([]),
    /** Weighted full-text document. `gatherly_tags_text` is created by the migration. */
    search: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('english', "title"), 'A') || setweight(to_tsvector('english', gatherly_tags_text("tags")), 'B') || setweight(to_tsvector('english', "summary"), 'C') || setweight(to_tsvector('english', "description"), 'D')`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('events_starts_at_status_idx').on(t.startsAt, t.status),
    index('events_organizer_id_idx').on(t.organizerId),
    index('events_search_idx').using('gin', t.search),
    // Typo-tolerant title matching (pg_trgm, enabled by the migration).
    index('events_title_trgm_idx').using('gin', t.title.op('gin_trgm_ops')),
    // Last line of defence against overbooking if a code path ever skips the conditional update.
    check(
      'events_registered_count_within_capacity',
      sql`${t.registeredCount} >= 0 and ${t.registeredCount} <= ${t.capacity}`,
    ),
    check('events_capacity_positive', sql`${t.capacity} > 0`),
    check('events_ends_after_starts', sql`${t.endsAt} > ${t.startsAt}`),
    check('events_price_non_negative', sql`${t.priceCents} >= 0`),
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

export const userProfiles = pgTable('user_profiles', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  interests: categoryEnum().array().$type<Category[]>().notNull().default([]),
  tags: text().array().notNull().default([]),
  neighborhood: text().$type<NeighborhoodId>(),
  homeLat: doublePrecision(),
  homeLng: doublePrecision(),
  radiusKm: integer().notNull().default(10),
  formats: text().array().$type<EventFormat[]>().notNull().default(['in_person', 'online']),
  timeSlots: text()
    .array()
    .$type<TimeSlot[]>()
    .notNull()
    .default(['weekday_daytime', 'weeknights', 'weekends']),
  onboardedAt: timestamptz(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

const eventMark = (name: string) =>
  pgTable(
    name,
    {
      userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
      eventId: uuid()
        .notNull()
        .references(() => events.id, { onDelete: 'cascade' }),
      createdAt: createdAt(),
    },
    (t) => [
      primaryKey({ columns: [t.userId, t.eventId] }),
      index(`${name}_event_id_idx`).on(t.eventId),
    ],
  );
export const eventSaves = eventMark('event_saves');
export const eventHides = eventMark('event_hides');

/** Append-only behaviour log for ranking and future models. No PII beyond ids. */
export const interactions = pgTable(
  'interactions',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    /** Device id for signed-out visitors. */
    anonymousId: uuid(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    type: interactionTypeEnum().notNull(),
    surface: text().$type<Surface>().notNull(),
    position: integer(),
    query: text(),
    rankerVersion: text(),
    requestId: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index('interactions_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('interactions_event_id_idx').on(t.eventId),
    check('interactions_actor', sql`${t.userId} is not null or ${t.anonymousId} is not null`),
  ],
);
