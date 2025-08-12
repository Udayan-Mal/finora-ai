import Stripe from "stripe";
import { Env } from "./env.config";

export const stripeClient = new Stripe(Env.STRIPE_SECRET_KEY, {
  // use package default api version pinned by the SDK to avoid TS literal issues
  // apiVersion: undefined,
  typescript: true,
  maxNetworkRetries: 2,
  timeout: 30000,
} as any);
