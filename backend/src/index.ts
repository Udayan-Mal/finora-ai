import "dotenv/config";
import "./config/passport.config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import passport from "passport";
import { Env } from "./config/env.config";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { BadRequestException } from "./utils/app-error";
import { asyncHandler } from "./middlewares/asyncHandler.middlerware";
import connctDatabase from "./config/database.config";
import authRoutes from "./routes/auth.route";
import { passportAuthenticateJwt } from "./config/passport.config";
import userRoutes from "./routes/user.route";
import transactionRoutes from "./routes/transaction.route";
import { initializeCrons } from "./cron";
import reportRoutes from "./routes/report.route";
import { getDateRange } from "./utils/date";
import analyticsRoutes from "./routes/analytics.route";
import billingRoutes from "./routes/billing.route";
import webhookRoutes from "./routes/webhook.route";

const app = express();
const BASE_PATH = Env.BASE_PATH;

// Note: Stripe webhooks need raw body; we mount webhook router before json body parser for that path.
app.use(`${BASE_PATH}/webhooks`, webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());

// Support multiple allowed origins via comma-separated FRONTEND_ORIGIN
const allowedOrigins = (Env.FRONTEND_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients or same-origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.get(
  "/",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Simple welcome route for root path
    res.status(HTTPSTATUS.OK).json({
      message: "Welcome to the Finora AI Finance SaaS API",
      basePath: BASE_PATH,
    });
  })
);

// Lightweight health check for uptime monitors and Render
app.get(
  `${BASE_PATH}/health`,
  asyncHandler(async (req: Request, res: Response) => {
    res.status(HTTPSTATUS.OK).json({ status: "ok" });
  })
);

app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/user`, passportAuthenticateJwt, userRoutes);
app.use(`${BASE_PATH}/transaction`, passportAuthenticateJwt, transactionRoutes);
app.use(`${BASE_PATH}/report`, passportAuthenticateJwt, reportRoutes);
app.use(`${BASE_PATH}/analytics`, passportAuthenticateJwt, analyticsRoutes);
app.use(`${BASE_PATH}/billing`, passportAuthenticateJwt, billingRoutes);

app.use(errorHandler);

app.listen(Env.PORT, async () => {
  await connctDatabase();

  if (Env.NODE_ENV === "development") {
    await initializeCrons();
  }

  console.log(`Server is running on port ${Env.PORT} in ${Env.NODE_ENV} mode`);
});
