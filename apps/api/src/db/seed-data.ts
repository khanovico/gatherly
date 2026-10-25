import type { events } from './schema';

type DemoEvent = Pick<
  typeof events.$inferInsert,
  | 'title'
  | 'summary'
  | 'description'
  | 'category'
  | 'format'
  | 'venueName'
  | 'address'
  | 'city'
  | 'onlineUrl'
  | 'timezone'
  | 'capacity'
  | 'status'
> & {
  /** Relative to the seed run: `days` from today at local time `at` in the event timezone. */
  when: { days: number; at: string; hours: number };
  cover: 1 | 2;
  /** Background members registered; Alex comes on top when `alex` is set. */
  going: number;
  alex?: true;
  /** A member name from DEMO_MEMBERS; defaults to Olivia. */
  organizer?: string;
};

/** Background members who fill attendee lists. Organizers among them get a Premium subscription. */
export const DEMO_MEMBERS = [
  'Daniel Okafor',
  'Priya Raman',
  'Lucas Ferreira',
  'Hannah Schmidt',
  'Marcus Johnson',
  'Sofia Alvarez',
  'Ethan Brooks',
  'Aisha Khan',
  'Noah Kim',
  'Grace Liu',
  'Tomás Rivera',
  'Chloe Martin',
  'Jamal Wright',
  'Emma Larsen',
  'Ravi Desai',
  'Isabella Rossi',
  'Owen Gallagher',
  'Zoe Nakamura',
  'Mateo García',
  'Leah Cohen',
];

export const DEMO_EVENTS: DemoEvent[] = [
  {
    title: 'Shipping LLM Features to Production',
    summary:
      'Three short talks on evals, guardrails and cost control from teams running AI in production.',
    description:
      'Prototypes are easy; production is not. Three engineers share what it took to move LLM features from demo to dependable: building eval suites that catch regressions, designing guardrails users never notice, and keeping inference costs predictable as usage grows.\n\nTalks run 15 minutes each, followed by an open Q&A and time to meet the speakers. Pizza and drinks from 6:00.',
    category: 'tech',
    format: 'in_person',
    venueName: 'Harborline Coworking',
    address: '410 Brannan St, 3rd floor',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    when: { days: 6, at: '18:00', hours: 3 },
    capacity: 80,
    cover: 1,
    going: 17,
  },
  {
    title: 'Sunrise Yoga on the Embarcadero',
    summary: 'An all-levels flow by the water to start the day calm and focused. Mats provided.',
    description:
      'Start your morning with a gentle 60-minute vinyasa flow on the waterfront, led by a certified instructor. All levels are welcome; we offer modifications throughout.\n\nWe meet on the lawn next to the pier. Mats and blocks are provided, but feel free to bring your own. Wear layers: mornings by the bay are cool.',
    category: 'wellness',
    format: 'in_person',
    venueName: 'Pier 14 Lawn',
    address: 'The Embarcadero at Mission St',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    when: { days: 4, at: '07:00', hours: 1 },
    capacity: 15,
    cover: 1,
    going: 14,
    alex: true,
  },
];
