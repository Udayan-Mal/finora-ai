import { z } from "zod";
import { SubscriptionPlanEnum } from "../models/subscription.model";

const callbackUrlSchema = z.string().url();
const newPlanSchema = z.enum([
  SubscriptionPlanEnum.MONTHLY,
  SubscriptionPlanEnum.YEARLY,
]);

export const upgradeToProSubscriptionSchema = z.object({
  callbackUrl: callbackUrlSchema,
  plan: newPlanSchema,
});

export const manageSubscriptionBillingPortalSchema = z.object({
  callbackUrl: callbackUrlSchema,
});

export const switchToSubscriptionPlanSchema = z.object({
  newPlan: newPlanSchema,
});

export type upgradeToProSubscriptionSchemaType = z.infer<
  typeof upgradeToProSubscriptionSchema
>;

export type switchToSubscriptionPlanSchemaType = z.infer<
  typeof switchToSubscriptionPlanSchema
>;