import { Request, Response } from "express";
import Stripe from "stripe";
import { stripeClient } from "../config/stripe.config";
import { Env } from "../config/env.config";
import SubscriptionModel from "../models/subscription.model";
import { SubscriptionStatus, SubscriptionPlanEnum } from "../models/subscription.model";

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    return res.status(400).send("Missing Stripe signature");
  }
  let event: Stripe.Event;

  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      sig,
      Env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    return res.status(400).send(`Webhook Error: ${error?.message}`);
  }

  try {
    switch (event.type) {
      case "customer.subscription.trial_will_end":
        console.log(
          `⚠️ Trial will end for user ${(event.data.object as Stripe.Subscription).metadata?.userId}`
        );
        break;
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {}
  return res.status(200).send("OK");
};
  async function handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ) {
    console.log("✅ Inside checkout.session.completed");
    const stripeSubscriptionId = session.subscription as string;
    if (!stripeSubscriptionId) return;

    const subscription = await stripeClient.subscriptions.retrieve(
      stripeSubscriptionId
    );

    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const status = SubscriptionStatus.ACTIVE;

    const update = {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      plan: getPlan(subscription),
      stripeCurrentPeriodStart: new Date(
        subscription.items.data[0]?.current_period_start * 1000
      ),
      stripeCurrentPeriodEnd: new Date(
        subscription.items.data[0]?.current_period_end * 1000
      ),
      status,
      upgradedAt: new Date(),
    };

    await SubscriptionModel.findOneAndUpdate(
      {
        userId,
        status: { $ne: SubscriptionStatus.ACTIVE },
      },
      { $set: update },
      { upsert: true }
    );

    console.log(
      `✅ Checkout completed for user ${userId} ~ Status: ${status} | stripe status: ${subscription.status}`
    );
  }

function getPlan(subscription: Stripe.Subscription) {
    const priceId = subscription.items.data[0].price.id;
    if (priceId === Env.STRIPE_MONTHLY_PLAN_PRICE_ID) {
      return SubscriptionPlanEnum.MONTHLY;
    } else if (priceId === Env.STRIPE_YEARLY_PLAN_PRICE_ID) {
      return SubscriptionPlanEnum.YEARLY;
    }
    return null;
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(
    `✅ Inside invoice.payment_succeeded`,
    `Amount: $${invoice.amount_paid / 100}`
  );
  // const subscriptionId = invoice.lines.data[0]?.subscription as string;
  // if (!subscriptionId) return;

  console.log(
    invoice.lines.data[0].parent?.subscription_item_details,
    "subscription_item_details"
  );

  console.log("------");

  const subscriptionId = invoice.parent?.subscription_details?.subscription as string;

  console.log(invoice.parent?.subscription_details, "subscriptionId");

  if (!subscriptionId) {
    console.log("No Subscription Id ", subscriptionId);
    return;
  }

  const subscription = await stripeClient.subscriptions.retrieve(
    subscriptionId
  );

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.log("No userId found", userId);
    return;
  }

  // console.log("passed userId checked");

  if (subscription.status === "trialing" && invoice.amount_paid === 0) {
    console.log("Skipping $0 invoice (trial setup)");
    return;
  }

    const update = {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      plan: getPlan(subscription),
      stripeCurrentPeriodStart: new Date(
        subscription.items.data[0]?.current_period_start * 1000
      ),
      stripeCurrentPeriodEnd: new Date(
        subscription.items.data[0]?.current_period_end * 1000
      ),
      status: SubscriptionStatus.ACTIVE,
      upgradedAt: new Date(),
    };

    await SubscriptionModel.findOneAndUpdate(
      {
        userId,
        status: { $ne: SubscriptionStatus.ACTIVE },
      },
      { $set: update },
      { upsert: true }
    );

    console.log(
      `✅ Payment succeeded – user ${userId} upgraded to ACTIVE`
    );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.lines.data[0]?.subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripeClient.subscriptions.retrieve(
    subscriptionId
  );

  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await SubscriptionModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        plan: null,
        status: SubscriptionStatus.PAYMENT_FAILED,
      },
    }
  );

  console.log(`❌ Payment failed – user ${userId}`);
}
    
async function handleCustomerSubscriptionUpdated(
  stripeSubscription: Stripe.Subscription
) {
  console.log(
    "Inside customer.subscription.updated",
    stripeSubscription.status
  );
  const userId = stripeSubscription.metadata?.userId;

  if (stripeSubscription.status === "trialing") {
    console.log("⏭ Skipping trialing subscription");
    return;
  }

  const priceId = stripeSubscription.items.data[0].price.id;
  const plan = getPlan(stripeSubscription);

  const currentSub = await SubscriptionModel.findOne({
    userId
  });
  if (!currentSub) {
    // console.log(`No subscription found for user ${userId}`);
    return;
  }

  const isPlanSwitch =
    currentSub?.plan !== plan ||
    currentSub.stripePriceId !== priceId;

  if (isPlanSwitch && stripeSubscription.status === "active") {
    await SubscriptionModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          plan,
          stripePriceId: priceId,
          stripeCurrentPeriodStart: new Date(
            stripeSubscription.items.data[0].current_period_start * 1000
          ),
          stripeCurrentPeriodEnd: new Date(
            stripeSubscription.items.data[0].current_period_end * 1000
          ),
        },
      },
      { upsert: true }
    );
  console.log(
    `✅ Plan switched – user ${userId} from ${currentSub?.plan} to ${plan}`
  );
} else {
    console.log(`No Plan switch detected for user ${userId}`);
  }
}

async function handleCustomerSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription
) {
  console.log(
    "❌ Inside customer.subscription.deleted",
    stripeSubscription.status
  );
  const userId = stripeSubscription.metadata?.userId;
  if (!userId) return;

  const isTrialExpired =
    stripeSubscription.trial_end && stripeSubscription.status === "canceled";

  await SubscriptionModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        status: isTrialExpired
          ? SubscriptionStatus.TRIAL_EXPIRED
          : SubscriptionStatus.CANCELED,
        plan: null,
        ...(!isTrialExpired && { canceledAt: new Date() }),
      },
    }
  );
  console.log(
    `✅ Subscription ${isTrialExpired ? "trial expired" : "canceled"} – user ${userId}`
  );
}