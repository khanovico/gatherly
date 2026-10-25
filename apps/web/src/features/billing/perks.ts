import { BarChart3, CalendarPlus, Ticket, Users, type LucideIcon } from 'lucide-react';

export type Perk = { icon: LucideIcon; title: string; description: string; comingSoon?: boolean };

/** What Premium adds on top of Free. Shared by the paywall, pricing and billing pages. */
export const premiumPerks: Perk[] = [
  { icon: CalendarPlus, title: 'Host unlimited events', description: 'In person or online.' },
  { icon: Users, title: 'Manage your guest list', description: "See who's coming." },
  { icon: BarChart3, title: 'Organizer dashboard', description: 'Registrations and capacity.' },
  { icon: Ticket, title: 'Sell tickets', description: 'Paid entry, payouts.', comingSoon: true },
];
