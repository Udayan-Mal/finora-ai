import useSWR from "swr";
import { PLAN_TYPE, PLANS } from "@/constant/plan.constant";
import { GetSubscriptionStatusResponse } from "@/features/billing/billingType";

const PLAN_LIST = Object.values(PLANS);
const SUBSCRIPTION_API_URL = `${import.meta.env.VITE_API_URL}/billing/subscription/status`;

interface SubscriptionStatus {
  isTrialActive: boolean;
  isPro: boolean;
  isTrial: boolean;
  plan: string | null;
  status: string | null;
  trialEndsAt?: string;
  daysLeft?: number;
//   planData?: any;
}

const fetcher = async (url: string, accessToken?: string | null) => {
  if (!accessToken) {
    return Promise.resolve(null);
  }
  return await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }).then((res) => res.json());
};

const useBillingSubscription = (accessToken?: string | null) => {
  const { data, error, isLoading } = useSWR<GetSubscriptionStatusResponse | null>(
    SUBSCRIPTION_API_URL,
    async (url: string) => fetcher(url, accessToken),
    {
      keepPreviousData: true,
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const subscriptionData = data?.data;
  const subscriptionStatus = (): SubscriptionStatus => {
    if (!subscriptionData) {
      return {
        isTrialActive: false,
        isPro: false,
        isTrial: false,
        plan: null,
        status: null,
        daysLeft: 0,
        
      };
    }

    const plan = subscriptionData.currentPlan || "";
    const status = subscriptionData.status || "unknown";

    return {
      isTrialActive: subscriptionData.isTrialActive || false,
      isPro: PLAN_LIST.includes(plan as PLAN_TYPE) && status === "active",
      isTrial: status === "trialing",
      plan,
      status,
        trialEndsAt: subscriptionData.trialEndsAt,
      daysLeft: subscriptionData.daysLeft,
     
    };
  };

  const status = subscriptionStatus();
  return {
    ...status,
    isLoading,
    isError: !!error,
    isSuccess: !error && !isLoading && !!subscriptionData,
    hasPlan: !!status.plan,
  };
};

export default useBillingSubscription;