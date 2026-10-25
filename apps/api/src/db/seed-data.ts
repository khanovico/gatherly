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
  /** A name from HOSTS; defaults to Olivia. */
  organizer?: string;
};

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
  {
    title: 'Hand-Pulled Noodles: A Cooking Class',
    summary:
      'Learn to mix, rest and pull your own noodles, then cook a bowl of biang biang to take home.',
    description:
      'Chef-led and fully hands-on: you mix the dough, learn why resting matters, and practice the pull until it clicks. We finish by cooking biang biang noodles with chili oil and sharing a meal together.\n\nAll ingredients and aprons are included. Tell us about allergies when you arrive; vegetarian options are available.',
    category: 'food',
    format: 'in_person',
    venueName: 'The Common Table Kitchen',
    address: '214 Grand St',
    city: 'Brooklyn',
    timezone: 'America/New_York',
    when: { days: 10, at: '18:30', hours: 2.5 },
    capacity: 12,
    cover: 1,
    going: 11,
    organizer: 'Priya Raman',
  },
  {
    title: 'Rust for TypeScript Developers',
    summary:
      'Ownership, borrowing and error handling explained through patterns you already know from TS.',
    description:
      'If you write TypeScript every day, Rust is closer than it looks. This session maps familiar ideas such as union types, narrowing and async to their Rust equivalents, then builds a small CLI live.\n\nSlides and the example repository are shared after the session.',
    category: 'tech',
    format: 'online',
    onlineUrl: 'https://live.gatherly.demo/rust-for-ts-devs',
    timezone: 'America/New_York',
    when: { days: -12, at: '12:00', hours: 1.5 },
    capacity: 300,
    cover: 2,
    going: 19,
    alex: true,
  },
  {
    title: 'Design Systems in Practice: Tokens to Components',
    summary: 'How one product team grew a design system from color tokens to 60 components, live.',
    description:
      'How do you go from a messy Figma file to a design system engineers actually use? This live session follows one product team through two years of work: naming tokens, deciding what belongs in the library, versioning, and measuring adoption.\n\nExpect real screenshots, honest mistakes and a 20-minute Q&A. Registered attendees get the recording.',
    category: 'design',
    format: 'online',
    onlineUrl: 'https://live.gatherly.demo/design-systems-in-practice',
    timezone: 'America/New_York',
    when: { days: 9, at: '17:00', hours: 1.5 },
    capacity: 250,
    cover: 1,
    going: 20,
    alex: true,
  },
  {
    title: 'Hands-on Postgres Performance Workshop',
    summary: 'Read query plans, pick the right index and fix slow queries on a real dataset.',
    description:
      'Bring a laptop with Docker installed and leave able to read EXPLAIN ANALYZE output with confidence. Together we work through a realistic e-commerce dataset: spotting sequential scans, choosing between B-tree, partial and covering indexes, and rewriting the queries ORMs get wrong.\n\nSeats are limited so everyone gets help from the instructor. Coffee and breakfast tacos provided.',
    category: 'tech',
    format: 'in_person',
    venueName: 'Eastside Tech Commons',
    address: '1100 E 6th St, Suite 200',
    city: 'Austin',
    timezone: 'America/Chicago',
    when: { days: 12, at: '09:30', hours: 4 },
    capacity: 18,
    cover: 2,
    going: 17,
  },
  {
    title: 'Portfolio Review Night',
    summary: 'Get 1:1 feedback on your design portfolio from senior designers and hiring managers.',
    description:
      'Bring your portfolio on a laptop or tablet and rotate through three 20-minute reviews with senior product designers and design managers. Reviewers focus on storytelling, case-study structure and what makes them want to interview someone.\n\nOpen to all levels, from career switchers to staff designers. Light snacks and drinks provided.',
    category: 'design',
    format: 'in_person',
    venueName: 'Studio Nine',
    address: '55 Washington St, Suite 410',
    city: 'Brooklyn',
    timezone: 'America/New_York',
    when: { days: 16, at: '18:30', hours: 2.5 },
    capacity: 20,
    cover: 2,
    going: 18,
  },
  {
    title: 'Marin Headlands Sunset Hike',
    summary: 'A moderate 5-mile loop with ocean views, finishing above the Golden Gate at sunset.',
    description:
      'We follow the coastal trail up from Rodeo Beach for wide Pacific views, then loop back along the ridge in time for sunset over the bridge. Expect about 1,100 feet of climbing at a conversational pace.\n\nBring water, a headlamp for the last stretch and a windproof layer. Carpools leave from the Civic Center at 2:45; reply in the event chat if you can drive.',
    category: 'outdoors',
    format: 'in_person',
    venueName: 'Rodeo Beach Trailhead',
    address: 'Bunker Rd, Marin Headlands',
    city: 'Sausalito',
    timezone: 'America/Los_Angeles',
    when: { days: 7, at: '15:30', hours: 3.5 },
    capacity: 25,
    cover: 1,
    going: 15,
    organizer: 'Daniel Okafor',
  },
  {
    title: "Founders' Breakfast: Raising Your First Round",
    summary:
      'Founders who closed seed rounds this year share what worked, over coffee and pastries.',
    description:
      'A candid breakfast conversation with three founders who raised pre-seed and seed rounds in the last twelve months. We cover building a target list, running a tight two-week process, and the questions that came up in every partner meeting.\n\nSmall group, no recording, so people can speak openly.',
    category: 'business',
    format: 'in_person',
    venueName: 'Ferry Building Loft',
    address: '1 Ferry Building, 2nd floor',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    when: { days: 8, at: '08:00', hours: 2 },
    capacity: 40,
    status: 'cancelled',
    cover: 1,
    going: 12,
  },
  {
    title: 'Pricing Your SaaS: A Practical Workshop',
    summary:
      'Pick a value metric, design tiers and run a price test without scaring existing customers.',
    description:
      'Most early-stage teams set prices once and never revisit them. In this interactive workshop you work through a pricing canvas for your own product: choosing a value metric, shaping good-better-best tiers and planning a safe price test.\n\nBring your current pricing page. Breakout rooms give you feedback from other founders.',
    category: 'business',
    format: 'online',
    onlineUrl: 'https://live.gatherly.demo/pricing-your-saas',
    timezone: 'America/New_York',
    when: { days: 20, at: '13:00', hours: 1.5 },
    capacity: 150,
    cover: 2,
    going: 14,
  },
  {
    title: 'Open Studio: Figure Drawing',
    summary: 'Untutored life drawing with a professional model, from quick gestures to long poses.',
    description:
      'A relaxed open studio for artists of every level. The session starts with one- and five-minute gestures and builds to a 40-minute pose. Easels and drawing boards are provided; bring your own paper and materials.\n\nThe studio is quiet during poses, with time to chat and share work at the break.',
    category: 'arts',
    format: 'in_person',
    venueName: 'Ironworks Art Collective',
    address: '320 Wythe Ave',
    city: 'Brooklyn',
    timezone: 'America/New_York',
    when: { days: -5, at: '19:00', hours: 2.5 },
    capacity: 25,
    cover: 1,
    going: 16,
  },
  {
    title: 'Golden Hour Street Photography Walk',
    summary: 'Shoot the West Loop at golden hour with tips on light, framing and candid portraits.',
    description:
      'Join a working street photographer for a slow walk through the West Loop as the light turns golden. We stop every few blocks for a short exercise on reading light, layering a frame or approaching strangers for a portrait.\n\nAny camera works, phones included. We finish with a casual photo share at a nearby cafe.',
    category: 'arts',
    format: 'in_person',
    venueName: 'Mary Bartelme Park',
    address: '115 S Sangamon St',
    city: 'Chicago',
    timezone: 'America/Chicago',
    when: { days: 11, at: '17:30', hours: 2 },
    capacity: 30,
    cover: 2,
    going: 12,
  },
  {
    title: 'Natural Wine Tasting: Small Producers of California',
    summary: 'Taste six low-intervention wines and meet two of the winemakers behind them.',
    description:
      'Explore six natural wines from small California producers, from a skin-contact Sauvignon Blanc to a chillable Sierra Foothills red. Two of the winemakers join to talk about farming, fermentation and why they bottle unfiltered.\n\nCheese and bread pairings included. Must be 21 or older; please bring ID.',
    category: 'food',
    format: 'in_person',
    venueName: 'Vine & Vessel',
    address: '2201 Mission St',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    when: { days: 18, at: '19:00', hours: 2 },
    capacity: 40,
    cover: 2,
    going: 13,
  },
  {
    title: 'Ocean Beach Cleanup & Coffee',
    summary: 'Two hours of beach cleanup with neighbors, then free coffee and pastries on us.',
    description:
      'Help keep Ocean Beach beautiful. We provide gloves, buckets and grabbers, split into small teams along the shore and log what we collect for the local conservancy.\n\nAfterwards, coffee and pastries are on us at the north end of the beach. Kids are welcome with a guardian.',
    category: 'community',
    format: 'in_person',
    venueName: 'Ocean Beach, Stairwell 17',
    address: 'Great Hwy at Lincoln Way',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    when: { days: 14, at: '09:30', hours: 3 },
    capacity: 60,
    cover: 1,
    going: 18,
    alex: true,
  },
];
