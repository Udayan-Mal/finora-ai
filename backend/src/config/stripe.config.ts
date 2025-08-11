import Stripe from "stripe";
import { Env } from "./env.config";

export const stripeClient = new Stripe(Env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
  typescript: true,
  maxNetworkRetries: 2,
  timeout: 30000,
});
