import Stripe from 'stripe';
import { env } from '../config/env.js';

export function isStripeConfigured(): boolean {
  const key = env.STRIPE_SECRET_KEY.trim();
  return (
    (key.startsWith('sk_test_') || key.startsWith('sk_live_')) &&
    !key.includes('replace_me') &&
    key.length >= 32
  );
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export function toStripeAmount(amount: number | string | { toString(): string }): number {
  return Math.round(Number(amount.toString()) * 100);
}

export function fromStripeAmount(amountCents: number): number {
  return Math.round(amountCents) / 100;
}
