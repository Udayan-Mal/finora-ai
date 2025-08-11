import { SubscriptionPlanEnum } from "../models/subscription.model";
export const planFeatures = {
  [SubscriptionPlanEnum.MONTHLY]: [
    "Unlimited transactions",
    "Advanced analytics",
    "Email support",
    "Basic reports",
  ],
  [SubscriptionPlanEnum.YEARLY]: [
    "Everything in Monthly",
    "Priority support",
    "Advanced reports",
    "API access",
    "Dedicated account manager",
  ],
};