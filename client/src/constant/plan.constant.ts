export const PLANS = {
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;

export type PLAN_TYPE = (typeof PLANS)[keyof typeof PLANS];