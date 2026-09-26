import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export function isLiveStripeKey(key: string): boolean {
  return (
    (key.startsWith('pk_test_') || key.startsWith('pk_live_')) &&
    !key.includes('replace_me') &&
    key.length >= 32
  );
}

export const stripePromise = isLiveStripeKey(publishableKey) ? loadStripe(publishableKey) : null;

export function hasStripeConfig(): boolean {
  return isLiveStripeKey(publishableKey);
}

export function isTestStripeKey(): boolean {
  return publishableKey.startsWith('pk_test_') && isLiveStripeKey(publishableKey);
}
