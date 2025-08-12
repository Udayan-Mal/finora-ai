import { SubscriptionDocument } from "../models/subscription.model";
import UserModel from "../models/user.model";
import { NotFoundException, UnauthorizedException, InternalServerException, BadRequestException } from "../utils/app-error";

import { convertToDollarUnit } from "../utils/format-currency";
import { SubscriptionPlanEnum, SubscriptionPriceEnum, SubscriptionStatus } from "../models/subscription.model";
import { planFeatures } from "../constant/subscription";
import { upgradeToProSubscriptionSchemaType, switchToSubscriptionPlanSchemaType } from "../validators/billing.validator";
import { stripeClient } from "../config/stripe.config"; // or wherever you initialize Stripe
import { Env } from "../config/env.config"; // or your actual env config file
import SubscriptionModel from "../models/subscription.model";

export const getUserSubscriptionStatusService = async (userId: string) => {
  const user = await UserModel.findById(userId).populate<{
    subscriptionId: SubscriptionDocument;
  }>("subscriptionId");
  if (!user) {
    throw new NotFoundException("User not found");
  }

  // Always reconcile from Stripe so plan switches reflect instantly even without webhooks
  if (user.stripeCustomerId) {
    try {
      const subs = await stripeClient.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 10,
      });
      const s =
        subs.data.find((x) => x.status === "active") ||
        subs.data.sort((a, b) => (b.created || 0) - (a.created || 0))[0];
      if (s) {
        const price = s.items.data[0]?.price;
        const priceId = typeof price === "string" ? price : price?.id;
        const plan = getPlanFromPriceId(priceId as string);
        const firstItem = s.items.data[0];
        const update = {
          userId: user._id,
          stripeSubscriptionId: s.id,
          stripePriceId: priceId,
          plan,
          stripeCurrentPeriodStart: firstItem?.current_period_start
            ? new Date(firstItem.current_period_start * 1000)
            : null,
          stripeCurrentPeriodEnd: firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : null,
          status: mapStripeStatus(s.status),
        } as any;

        const doc = await SubscriptionModel.findOneAndUpdate(
          { userId: user._id },
          { $set: update },
          { upsert: true, new: true }
        );
        if (!user.subscriptionId) {
          user.subscriptionId = doc._id as any;
          await user.save();
        }
      }
    } catch (e) {
      // Swallow fallback errors so endpoint never 500s
    }
  }

  if (!user.subscriptionId) {
    // Create a temporary trial view without persisting a Stripe subscription
    const TRIAL_DAYS = Number(Env.TRIAL_DAYS || 7);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    return {
      subscriptionData: buildSubscriptionPayload(null, SubscriptionStatus.TRIALING, trialEndsAt, TRIAL_DAYS),
    };
  }

  // Ensure we use latest subscription from DB after possible upsert
  const latestSub = await SubscriptionModel.findOne({ userId: user._id }).lean();
  const subscriptionDoc = (latestSub || (user.subscriptionId as any)) as any;
  // Backfill missing status for existing records created before schema had 'status'
  let statusValue = subscriptionDoc.status as any;
  if (!statusValue) {
    const nowTs = Date.now();
    const trialEndTs = subscriptionDoc.trialEndsAt?.getTime() ?? 0;
    const inferredStatus: SubscriptionStatus = trialEndTs > nowTs
      ? SubscriptionStatus.TRIALING
      : SubscriptionStatus.TRIAL_EXPIRED;
    await SubscriptionModel.updateOne(
      { _id: (subscriptionDoc as any)._id },
      { $set: { status: inferredStatus } }
    );
    statusValue = inferredStatus;
  }

  const isTrialActive =
    statusValue === SubscriptionStatus.TRIALING &&
    (subscriptionDoc.trialEndsAt
      ? subscriptionDoc.trialEndsAt.getTime() > Date.now()
      : false);

  const now = new Date();
  const daysLeft =
    subscriptionDoc.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (subscriptionDoc.trialEndsAt.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const planData = buildPlanData();

  const subscriptionData = {
    isTrialActive,
    currentPlan: subscriptionDoc.plan,
    trialEndsAt: subscriptionDoc.trialEndsAt,
    trialDays: subscriptionDoc.trialDays,
  status: statusValue,
    daysLeft: isTrialActive ? daysLeft : 0,
    planData,
  };

    return {
    subscriptionData,
    
    };
};

function buildPlanData() {
  return {
    [SubscriptionPlanEnum.MONTHLY]: {
      price: convertToDollarUnit(SubscriptionPriceEnum.MONTHLY),
      billing: "month",
      savings: null,
      features: planFeatures[SubscriptionPlanEnum.MONTHLY],
    },
    [SubscriptionPlanEnum.YEARLY]: {
      price: convertToDollarUnit(SubscriptionPriceEnum.YEARLY),
      billing: "year",
      savings: "Save 17%",
      features: planFeatures[SubscriptionPlanEnum.YEARLY],
    },
  } as const;
}

function buildSubscriptionPayload(
  plan: SubscriptionPlanEnum | null,
  status: SubscriptionStatus,
  trialEndsAt: Date | null,
  trialDays: number
) {
  const now = new Date();
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    isTrialActive: status === SubscriptionStatus.TRIALING && daysLeft > 0,
    currentPlan: plan,
    trialEndsAt,
    trialDays,
    status,
    daysLeft,
    planData: buildPlanData(),
  };
}

function mapStripeStatus(s: string): SubscriptionStatus {
  switch (s) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "unpaid":
      return SubscriptionStatus.PAYMENT_FAILED;
    default:
      return SubscriptionStatus.TRIAL_EXPIRED;
  }
}

function getPlanFromPriceId(priceId: string | null | undefined): SubscriptionPlanEnum | null {
  if (!priceId) return null;
  if (priceId === Env.STRIPE_MONTHLY_PLAN_PRICE_ID) return SubscriptionPlanEnum.MONTHLY;
  if (priceId === Env.STRIPE_YEARLY_PLAN_PRICE_ID) return SubscriptionPlanEnum.YEARLY;
  return null;
}

export const upgradeToProSubscriptionService = async (
  userId: string,
  body: upgradeToProSubscriptionSchemaType
) => {
  const { callbackUrl, plan } = body;
  const user = await UserModel.findById(userId).populate<{
    subscriptionId: SubscriptionDocument;
  }>("subscriptionId");
  if (!user) throw new NotFoundException("User not found");
  if (user.subscriptionId?.status === SubscriptionStatus.ACTIVE) {
    throw new UnauthorizedException("You already have an active subscription");
  }

  if (!user.stripeCustomerId) {
    const customer = await stripeClient.customers.create({
      email: user.email,
      name: user.name,
    });
    user.stripeCustomerId = customer.id;
    await user.save();
  }

  const _userId = user.id?.toString();
  const priceId =
    plan === SubscriptionPlanEnum.MONTHLY
      ? Env.STRIPE_MONTHLY_PLAN_PRICE_ID
      : Env.STRIPE_YEARLY_PLAN_PRICE_ID;

  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer: user.stripeCustomerId,
    success_url: `${callbackUrl}?success=true&plan=${plan}`,
    cancel_url: `${callbackUrl}?success=false`,
    payment_method_types: ["card"],
    billing_address_collection: "auto",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        userId: _userId,
        plan,
      },
    },
  });

  return { url: session.url };
};

export const manageSubscriptionBillingPortalService = async (
  userId: string,
  callbackUrl: string
) => {
  try {
    const user = await UserModel.findById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new NotFoundException("User or Stripe customer not found");
    }

    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: callbackUrl,
    });
    return portalSession.url;
  } catch (err: any) {
    console.log(err);
    if (
      err.type === "StripeInvalidRequestError" &&
      err?.raw?.message?.includes("No configuration provided")
    ) {
      throw new InternalServerException(
        "Billing portal is not available. Please contact support"
      );
    }
    throw err;
  }
};

export const switchToSubscriptionPlanService = async (
  userId: string,
  body: switchToSubscriptionPlanSchemaType
) => {
  const { newPlan } = body;

  const user = await UserModel.findById(userId).populate<{
    subscriptionId: SubscriptionDocument; 
  }>("subscriptionId");

  if (!user || !user.subscriptionId?.stripeSubscriptionId)
    throw new UnauthorizedException(
      "You dont have an active subscription to switch"
    );

  if (user.subscriptionId.plan === newPlan) {
    throw new BadRequestException(`You are already on the ${newPlan} plan`);
  }

  const subscription = await stripeClient.subscriptions.retrieve(
    user.subscriptionId.stripeSubscriptionId
  );

  const priceId =
    newPlan === SubscriptionPlanEnum.YEARLY
      ? Env.STRIPE_YEARLY_PLAN_PRICE_ID
      : Env.STRIPE_MONTHLY_PLAN_PRICE_ID;

  if (!priceId)
    throw new InternalServerException("Subscription PriceId configure error");

  await stripeClient.subscriptions.update(subscription.id, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: "create_prorations",
    payment_behavior: "error_if_incomplete",
    metadata: {
      userId: user.id,
      plan: newPlan,
    },
  });

  return {
    success: true,
    message: `Plan switch to ${newPlan} is being processed`,
  };
};

