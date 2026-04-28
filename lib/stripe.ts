import { loadStripe } from '@stripe/stripe-js';
import { stripePublishableKey } from './env';

if (!stripePublishableKey) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
}

export const stripePromise = loadStripe(stripePublishableKey);