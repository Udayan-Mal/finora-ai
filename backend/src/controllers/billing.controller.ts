import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import { getUserSubscriptionStatusService } from "../services/billing.service";
import {
  upgradeToProSubscriptionSchema,
  manageSubscriptionBillingPortalSchema,
  switchToSubscriptionPlanSchema,
} from "../validators/billing.validator";
import {
  upgradeToProSubscriptionService,
  manageSubscriptionBillingPortalService,
  switchToSubscriptionPlanService,
} from "../services/billing.service";
// no-op

export const getUserSubscriptionStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const { subscriptionData } = await getUserSubscriptionStatusService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Subscription fetched successfully",
      data: subscriptionData,
    });
  }
);

export const upgradeToProSubscriptionController =
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = upgradeToProSubscriptionSchema.parse(req.body);

    const { url } = await upgradeToProSubscriptionService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Payment Url generated successfully",
      url,
    });
  });

export const manageSubscriptionBillingPortalController =
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = manageSubscriptionBillingPortalSchema.parse(req.body);

    const url = await manageSubscriptionBillingPortalService(
      userId,
      body.callbackUrl
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Payment URL generated successfully",
      url,
    });
  });

export const switchToSubscriptionPlanController =
  asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id;
      const body = switchToSubscriptionPlanSchema.parse(req.body);

  const result = await switchToSubscriptionPlanService(userId, body);

  return res.status(HTTPSTATUS.OK).json(result);
    }
  );


