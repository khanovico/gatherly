import {
  CATEGORIES,
  NEIGHBORHOODS,
  TIME_SLOTS,
  type Borough,
  type Category,
  type Persona,
} from '@gatherly/shared';
import type { Random } from './seed-random';
import type { userProfiles, users } from './schema';

type Profile = Omit<typeof userProfiles.$inferInsert, 'userId' | 'createdAt' | 'updatedAt'> & {
  interests: Category[];
};
export type SeedMember = Pick<typeof users.$inferInsert, 'name' | 'bio' | 'createdAt'> & {
  /** Null: signed up but never opened onboarding, so the API serves profile defaults. */
  profile: Profile | null;
};

const DAY_MS = 86_400_000;

/** Members who host events (Premium). Listed first so event fixtures can name them. */
export const HOSTS = [
  'Daniel Okafor',
  'Priya Raman',
  'Marcus Johnson',
  'Grace Liu',
  'Tomás Rivera',
];

// prettier-ignore
const FIRST_NAMES = ['Aaliyah', 'Adrian', 'Amara', 'Ana', 'Ben', 'Camila', 'Caleb', 'Chen', 'Dev', 'Diego', 'Elena', 'Eli', 'Farah', 'Felix', 'Gabriel', 'Hana', 'Imani', 'Isaac', 'Jade', 'Jonah', 'Julia', 'Kai', 'Kofi', 'Laila', 'Leo', 'Lucia', 'Maya', 'Mei', 'Miles', 'Nadia', 'Nico', 'Nina', 'Omar', 'Paloma', 'Quinn', 'Rafael', 'Rosa', 'Ruby', 'Sana', 'Santiago', 'Simone', 'Tariq', 'Tess', 'Theo', 'Uma', 'Vera', 'Wes', 'Yara', 'Yusuf', 'Zara'];
// prettier-ignore
const LAST_NAMES = ['Abbott', 'Adeyemi', 'Bauer', 'Brennan', 'Castillo', 'Chowdhury', 'Cruz', 'Delgado', 'Dubois', 'Ellis', 'Fischer', 'Flores', 'Goldberg', 'Hayes', 'Hughes', 'Ibrahim', 'Ito', 'Jensen', 'Kapoor', 'Kowalski', 'Lam', 'Lindqvist', 'Mendoza', 'Murphy', 'Nguyen', 'Novak', 'Obi', 'Ortiz', 'Park', 'Petrov', 'Quinn', 'Reyes', 'Romano', 'Sato', 'Shapiro', 'Silva', 'Sullivan', 'Tanaka', 'Torres', 'Vasquez', 'Walsh', 'Wong', 'Yilmaz', 'Zhang'];
// prettier-ignore
const JOBS = ['Product designer', 'Software engineer', 'ER nurse', 'High school teacher', 'Data analyst', 'Line cook', 'Architect', 'Grad student', 'Freelance photographer', 'Marketing lead', 'Physical therapist', 'Startup founder', 'Paralegal', 'UX researcher', 'Accountant', 'Session musician', 'Urban planner', 'Copywriter'];

/** Tag vocabulary per category: member interests and event tags both draw from it. */
export const CATEGORY_TAGS: Record<Category, string[]> = {
  tech: ['machine-learning', 'web-development', 'open-source', 'data', 'cloud'],
  design: ['ux-research', 'typography', 'design-systems', 'illustration', 'product-design'],
  business: ['startups', 'fundraising', 'marketing', 'careers', 'pricing'],
  wellness: ['yoga', 'running', 'meditation', 'strength-training', 'mental-health'],
  arts: ['photography', 'drawing', 'live-music', 'film', 'writing'],
  outdoors: ['hiking', 'cycling', 'kayaking', 'parks', 'birding'],
  food: ['cooking', 'wine', 'coffee', 'ramen', 'baking'],
  community: ['volunteering', 'language-exchange', 'board-games', 'book-club', 'gardening'],
};

const BOROUGH_WEIGHT: Record<Borough, number> = {
  Brooklyn: 4,
  Manhattan: 3,
  Queens: 2,
  Bronx: 1,
  'Staten Island': 1,
};

/** "Upper West Side" → "the Upper West Side" */
const place = (name: string) => (/Side|Village|District/.test(name) ? `the ${name}` : name);

const phrase = (tags: string[]) =>
  tags
    .map((t) => t.replaceAll('-', ' '))
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1');

const generateProfile = (random: Random, createdAt: Date): Profile => {
  const home = random.weighted(NEIGHBORHOODS.map((n) => [n, BOROUGH_WEIGHT[n.borough]] as const));
  // Some members share browser location instead of picking a neighborhood.
  const located = random.chance(0.15);
  const jitter = () => (random.next() - 0.5) * 0.016;
  const interests = random.sample(CATEGORIES, random.int(3, 5));
  return {
    interests,
    tags: interests.filter(() => random.chance(0.6)).map((c) => random.pick(CATEGORY_TAGS[c])),
    neighborhood: home.id,
    homeLat: located ? home.lat + jitter() : null,
    homeLng: located ? home.lng + jitter() : null,
    radiusKm: random.weighted([
      [2, 1],
      [5, 3],
      [10, 4],
      [25, 2],
    ] as const),
    formats: [
      ...random.weighted([
        [['in_person', 'online'], 7],
        [['in_person'], 2.2],
        [['online'], 0.8],
      ] as const),
    ],
    timeSlots: TIME_SLOTS.filter((slot) => slot === 'weekends' || random.chance(0.55)),
    onboardedAt: new Date(+createdAt + random.int(2, 30) * 60_000),
  };
};

const generateBio = (random: Random, profile: Profile, createdAt: Date) => {
  const hood = NEIGHBORHOODS.find((n) => n.id === profile.neighborhood)!;
  const likes = phrase(
    random.sample(
      profile.interests.flatMap((c) => CATEGORY_TAGS[c]),
      3,
    ),
  );
  return random.pick([
    `${random.pick(JOBS)} in ${place(hood.name)}. Into ${likes}.`,
    `${random.pick(JOBS)} by day. ${hood.borough} local, always up for ${likes}.`,
    `Moved to ${place(hood.name)} in ${createdAt.getUTCFullYear() - random.int(0, 6)}. Looking for people who like ${likes}.`,
  ]);
};

/** Hosts plus generated members with unique names, profiles and bios. */
export const generateMembers = (random: Random, now: Date, count: number): SeedMember[] => {
  const names = new Set(HOSTS);
  while (names.size < count) names.add(`${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`);
  return [...names].map((name) => {
    const createdAt = new Date(+now - random.int(20, 540) * DAY_MS);
    const profile =
      HOSTS.includes(name) || random.chance(0.92) ? generateProfile(random, createdAt) : null;
    const bio = profile && random.chance(0.9) ? generateBio(random, profile, createdAt) : null;
    return { name, bio, createdAt, profile };
  });
};

/** Persona bios and preferences; reset restores them so the guided demo always starts the same. */
export const PERSONA_PROFILES: Record<Persona, { bio: string; profile: Profile }> = {
  attendee: {
    bio: 'Backend engineer in Williamsburg. Weeknight meetups, weekend hikes and a long list of ramen spots to try.',
    profile: {
      interests: ['tech', 'food', 'outdoors'],
      tags: ['machine-learning', 'ramen', 'hiking'],
      neighborhood: 'williamsburg',
      radiusKm: 10,
      formats: ['in_person', 'online'],
      timeSlots: ['weeknights', 'weekends'],
    },
  },
  organizer: {
    bio: 'Community organizer in the East Village. I host cooking nights, photo walks and small workshops where people actually talk to each other.',
    profile: {
      interests: ['community', 'food', 'arts', 'design'],
      tags: ['cooking', 'photography', 'volunteering'],
      neighborhood: 'east-village',
      radiusKm: 25,
      formats: ['in_person', 'online'],
      timeSlots: ['weeknights', 'weekends'],
    },
  },
  admin: {
    bio: 'Keeps Gatherly running. Product and platform, Midtown.',
    profile: {
      interests: ['tech', 'business', 'design'],
      tags: ['startups', 'design-systems'],
      neighborhood: 'midtown',
      radiusKm: 5,
      formats: ['in_person', 'online'],
      timeSlots: ['weekday_daytime', 'weeknights'],
    },
  },
};
