import type { Persona } from '@gatherly/shared';

type PersonaInfo = { badge: string; tagline: string; abilities: string[]; home: string };

/** How each demo persona is introduced, and where signing in as it lands. */
export const personaInfo: Record<Persona, PersonaInfo> = {
  organizer: {
    badge: 'Organizer · Premium',
    tagline: 'Hosts meetups and workshops for the community.',
    abilities: ['Create and edit events', 'Manage guest lists', 'Track capacity on a dashboard'],
    home: '/organizer',
  },
  attendee: {
    badge: 'Attendee · Free',
    tagline: 'Loves discovering new events nearby and online.',
    abilities: ['Discover and register for events', 'Keep tickets in one place', 'Preview Premium'],
    home: '/events',
  },
  admin: {
    badge: 'Admin',
    tagline: 'Keeps the platform safe and running smoothly.',
    abilities: ['See platform-wide stats', 'Manage users, roles and plans', 'Reset the demo data'],
    home: '/admin',
  },
};
