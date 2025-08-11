import { Router } from "express";
import {
  getUserSubscriptionStatusController,
  manageSubscriptionBillingPortalController,
  switchToSubscriptionPlanController,
  upgradeToProSubscriptionController,
} from "../controllers/billing.controller";

const billingRoutes = Router();

billingRoutes.post("/subscription/upgrade", upgradeToProSubscriptionController);

billingRoutes.post(
  "/subscription/billing-portal",
  manageSubscriptionBillingPortalController
);

billingRoutes.post(
  "/subscription/switch-plan",
  switchToSubscriptionPlanController
);

billingRoutes.get("/subscription/status", getUserSubscriptionStatusController);


export default billingRoutes;