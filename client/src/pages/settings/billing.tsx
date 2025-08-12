import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpgradeToProSubscriptionMutation, useManageSubscriptionBillingPortalMutation, useSwitchToSubscriptionPlanMutation } from "@/features/billing/billingAPI";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { useSearchParams } from "react-router-dom";
import { useGetUserSubscriptionStatusQuery } from "@/features/billing/billingAPI";
import { PLAN_TYPE, PLANS } from "@/constant/plan.constant";
import { useState, useMemo, useEffect } from "react";
// import { BillingPlanCard } from "@/components/BillingPlanCard";
// import BillingSkeleton from "@/components/skeletons/BillingSkeleton";
import { toast } from "sonner";
// ...existing code...
import { AppAlert } from "@/components/app-alert";
import BillingPlanCard from "./_components/billing-plan-card";

const BILLING_URL = `${window.location.origin}${PROTECTED_ROUTES.SETTINGS_BILLING}`;

const PLAN_LIST = Object.values(PLANS);

const Billing = () => {
  const [searchParams] = useSearchParams();
  const isSuccess = searchParams.get("success");

  const [isYearly, setIsYearly] = useState(false);

  const [upgradeToProSubscription, { isLoading: upgradeLoading }] = useUpgradeToProSubscriptionMutation();
  const [manageSubscriptionBillingPortal, { isLoading: billingPortalLoading }] = useManageSubscriptionBillingPortalMutation();

  const [switchToSubscriptionPlan, { isLoading: switchPlanLoading }] = useSwitchToSubscriptionPlanMutation();
  // Track a pending plan switch so we can poll until Stripe confirms
  const [pendingPlan, setPendingPlan] = useState<PLAN_TYPE | null>(null);

  const { data, isFetching, refetch } = useGetUserSubscriptionStatusQuery(
    undefined,
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const subscriptionData = data?.data;
  const currentPlan = subscriptionData?.currentPlan || "";
  const daysLeft = subscriptionData?.daysLeft || 0;
  const status = subscriptionData?.status || "trialing";
  const isPro = PLAN_LIST.includes(currentPlan as PLAN_TYPE) && status === "active";
  const planData = subscriptionData?.planData;

  const selectedPlanData = isYearly ? planData?.YEARLY : planData?.MONTHLY;

  useEffect(() => {
    if (isSuccess === "true") {
      toast.success("You have successfully subscribed to Finora Pro");
      // Ensure UI reflects paid state immediately
      refetch();
    }
    if (isSuccess === "false") {
      toast.error("Subscription was canceled");
    }
  }, [isSuccess, refetch]);

  const alertProps = useMemo(() => {
    if (isPro && status === "active") {
      return {
        title: "Pro Plan",
        variant: "success" as const,
        message: `You are currently on a ${currentPlan} plan.`,
      };
    }

    if (status === "trialing") {
    if (daysLeft && daysLeft > 3) {
      return {
        title: "Free Trial",
        variant: "info" as const,
        message: `You are on a free trial. ${daysLeft} days left.`,
      };
    }

    if (daysLeft && daysLeft <= 3) {
      return {
        title: "Trial Expiring",
        variant: "warning" as const,
        message: `Trial expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Please upgrade.`,
      };
    }
  }

    if (status === "trial_expired") {
      return {
        title: "Trial Expired",
        variant: "destructive" as const,
        message: "Your trial has expired, please upgrade to continue.",
      };
    }

    if (status === "canceled") {
      return {
        title: "Subscription Canceled",
        variant: "destructive" as const,
        message: "Your subscription has been canceled, please upgrade to continue.",
      };
    }

    return {
      title: "Subscription status Unknown",
      variant: "warning" as const,
      message: "We couldn't determine your subscription status",
    };
  }, [currentPlan, isPro, status]);

  const handleSubscriptionAction = () => {
    if (!isPro) {
      upgradeToProSubscription({
        plan: isYearly ? PLANS.YEARLY : PLANS.MONTHLY,
        callbackUrl: BILLING_URL,
      })
        .unwrap()
        .then((res) => {
          window.location.href = res.url;
        })
        .catch((err) => {
          toast.error(
            err?.data?.message || "Failed to upgrade subscription. Try again."
          );
        });
    } else if (currentPlan !== (isYearly ? PLANS.YEARLY : PLANS.MONTHLY)) {
      console.log("switch plan");
      handleSwitchSubscription();
    } else {
      handleManageSubscription();
    }
  };

  const handleManageSubscription = () => {
    manageSubscriptionBillingPortal({
      callbackUrl: BILLING_URL,
    })
      .unwrap()
      .then((res) => {
        window.location.href = res.url;
      })
      .catch((err) => {
        toast.error(
          err?.data?.message || "Failed to manage subscription, Try again"
        );
      });
  };

  const handleSwitchSubscription = () => {
    const targetPlan = isYearly ? PLANS.YEARLY : PLANS.MONTHLY;
    if (currentPlan === targetPlan) {
      toast.info("You are already on this plan");
      return;
    }
    switchToSubscriptionPlan({
      newPlan: targetPlan,
    })
      .unwrap()
      .then((res) => {
        // Start polling for up to ~30s until plan flips
        setPendingPlan(targetPlan as PLAN_TYPE);
        toast.success(res.message);
        pollForPlan(targetPlan as PLAN_TYPE);
      })
      .catch((err) => {
        toast.error(
          err?.data?.message || "Failed to switch subscription"
        );
      });
  };

  // Poll helper: refetch status every 2s up to 15 attempts or until plan matches
  const pollForPlan = async (target: PLAN_TYPE) => {
    let attempts = 0;
    while (attempts < 15) {
      attempts++;
      const result = await refetch();
      const latest = result?.data as typeof data | undefined;
      const plan = latest?.data?.currentPlan;
      const status = latest?.data?.status;
      if (plan === target && status === "active") {
        toast.success(`Switched to ${target} plan`);
        setPendingPlan(null);
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    // Give a gentle nudge if still processing
    setPendingPlan(null);
    toast.info("Plan switch is processing. It will update shortly.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>
      <Separator />

      <div className="w-full space-y-6">
        {isFetching ? (
          <BillingSkeleton />
        ) : (
          <>
            <AppAlert
              title={alertProps.title}
              message={alertProps.message}
              variant={alertProps.variant}
              showDismissButton={false}
            />
            <BillingPlanCard
              selectedPlan={selectedPlanData}
              isYearly={isYearly}
              isLoading={
                upgradeLoading ||
                billingPortalLoading ||
                switchPlanLoading ||
                Boolean(pendingPlan)
              }
              isPro={isPro || false}
              currentPlanType={currentPlan as PLAN_TYPE}
              onPlanChange={setIsYearly}
              onSubscriptionAction={handleSubscriptionAction}
            />
          </>
        )}
      </div>
    </div>
  );
};

const BillingSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[80%]" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
};

export default Billing;
