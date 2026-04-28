import Stripe from 'stripe';
import { stripeSecretKey } from './env';

let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey);
} else {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will not work.');
}

export { stripe };