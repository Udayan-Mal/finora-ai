import { apiClient } from "@/app/api-client";
import { UpgradeToProSubscriptionPayload, GetSubscriptionStatusResponse } from "./billingType";
import { PLAN_TYPE } from "@/constant/plan.constant";

export const billingApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    upgradeToProSubscription: builder.mutation<
      { url: string },
      UpgradeToProSubscriptionPayload
    >({
      query: (body) => ({
        url: "/billing/subscription/upgrade",
        method: "POST",
        body,
      }),
    }),

    manageSubscriptionBillingPortal: builder.mutation<
      { url: string },
      { callbackUrl: string }
    >({
      query: (body) => ({
        url: "/billing/subscription/billing-portal",
        method: "POST",
        body,
      }),
    }),

    getUserSubscriptionStatus: builder.query<
      GetSubscriptionStatusResponse,
      void
   >({
      query: () => ({
        url: "/billing/subscription/status",
        method: "GET",
      }),
    }),

    switchToSubscriptionPlan: builder.mutation<
      { success: boolean; message: string },
      { newPlan: PLAN_TYPE }
    >({
      query: (body) => ({
        url: "/billing/subscription/switch-plan",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useUpgradeToProSubscriptionMutation,
  useGetUserSubscriptionStatusQuery,
  useSwitchToSubscriptionPlanMutation,
  useManageSubscriptionBillingPortalMutation,
} = billingApi;