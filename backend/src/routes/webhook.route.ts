import express, { Request, Response, Router } from "express";
import { stripeWebhookHandler } from "../webhooks/stripe.webhook";

const webhookRoutes = Router();

webhookRoutes.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    await stripeWebhookHandler(req, res);
  }
);

export default webhookRoutes;