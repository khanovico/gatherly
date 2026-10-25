import type { PlanCode } from '@gatherly/shared';
import { AppError } from '../../lib/errors';

/** Seam for the real billing provider (Stripe Billing in docs/monetization.md). */
export interface PaymentProvider {
  /** Starts a hosted checkout and returns the URL to send the buyer to. */
  createCheckout(input: { userId: string; plan: PlanCode }): Promise<{ url: string }>;
}

/** Stand-in until payments ship: every checkout answers 501 COMING_SOON. */
export const mockPaymentProvider: PaymentProvider = {
  createCheckout: async () => {
    throw new AppError('COMING_SOON', 501, 'Paid plans are coming soon');
  },
};
