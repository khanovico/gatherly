import { config } from '../config';

/** Every seeded account (personas and members) uses this domain; sign-up refuses it. */
export const DEMO_EMAIL_DOMAIN = '@gatherly.demo';

export const isDemoEmail = (email: string) => email.endsWith(DEMO_EMAIL_DOMAIN);

/**
 * On the public demo anyone can be the admin or the organizer, so real accounts' emails are
 * masked: `jane@example.com` → `j***@example.com`. Demo emails and non-demo deployments are untouched.
 */
export const visibleEmail = (email: string) =>
  !config.DEMO_MODE || isDemoEmail(email) ? email : email.replace(/^(.).*@/, '$1***@');

/** On the public demo, admins may look at real accounts but never change them. */
export const isReadOnlyAccount = (email: string) => config.DEMO_MODE && !isDemoEmail(email);
