import Stripe from 'stripe';

// Lazy init to prevent build-time errors (same pattern as lib/db.ts)
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}
