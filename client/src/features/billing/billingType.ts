import { PLAN_TYPE } from "@/constant/plan.constant";

export interface UpgradeToProSubscriptionPayload {
  callbackUrl: string;
  plan: PLAN_TYPE;
}

export interface PlanData {
  price: string;
  billing: string;
  savings: string | null;
  features: string[];
}

export interface GetSubscriptionStatusResponse {
  message: string;
  data: {
    isTrialActive: boolean;
    currentPlan: PLAN_TYPE;
    trialEndsAt: string;
    trialDays: number;
    status: string;
    daysLeft: number;
    planData: {
      [key in PLAN_TYPE]: PlanData;
    };
  };
}