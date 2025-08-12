<div align="center">

# Finora — AI‑powered Personal Finance & Subscription Platform

Track spending, analyze habits, and upgrade to Pro with one click. Built on the MERN stack with TypeScript and Stripe billing.

</div>

---

## At a glance

Non‑technical overview:
- Add income/expense transactions and upload receipts. The app reads your receipt using AI and fills in details for you.
- See charts and insights that explain where your money goes.
- Get automatic monthly email reports.
- Start with a free trial. When you’re ready, upgrade to Pro (monthly or yearly) through Stripe. You can also manage/cancel your plan.

Technical overview:
- Frontend: React + TypeScript + Vite
- Backend: Node.js (Express) + TypeScript
- Database: MongoDB (Mongoose)
- Billing: Stripe Checkout + Customer Portal + Webhooks
- Extras: Cloudinary (profile photos), Resend (emails), Gemini/GenAI (receipt OCR)

---

## Features

- Authentication with JWT (login, signup)
- Create, edit, import (CSV) and search transactions
- Receipt scanning with AI (optional API key)
- Rich analytics (category breakdown, trend lines, date ranges)
- Recurring transactions (cron)
- Monthly email reports
- Profile photo upload (Cloudinary)
- Stripe billing: free trial, monthly/yearly plans, plan switching, customer portal

---

## Project structure

```
backend/              # Express + TypeScript API
client/               # React + TypeScript + Vite app
```

Key endpoints:
- API base: /api
- Stripe webhooks: POST /api/webhooks/stripe

---

## Quick start (local)

Prerequisites:
- Node.js 18+
- MongoDB (local or Atlas)
- A Stripe test account

1) Clone and install
```bash
git clone <this-repo-url>
cd Advanced-MERN-AI-Financial-SaaS-Platform
cd backend && npm install
cd ../client && npm install
```

2) Environment files

Create backend/.env
```env
PORT=8000
BASE_PATH=/api
MONGO_URI=mongodb://localhost:27017/finora

JWT_SECRET=change_me
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change_me_too
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_ORIGIN=http://localhost:5173
TRIAL_DAYS=7

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_MONTHLY_PLAN_PRICE_ID=price_monthly_xxx
STRIPE_YEARLY_PLAN_PRICE_ID=price_yearly_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Optional integrations
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
RESEND_MAILER_SENDER=
GEMINI_API_KEY=
```

Create client/.env.local
```env
VITE_API_URL=http://localhost:8000/api
# Development helper: lets you browse the app without being blocked by billing checks
VITE_DISABLE_BILLING_GUARD=true
```

3) Start the apps

Terminal A
```bash
cd backend
npm run dev
```

Terminal B
```bash
cd client
npm run dev
```

Open http://localhost:5173

---

## Stripe setup (test mode)

1) Create a Product “Finora Pro” with two recurring prices:
- Monthly (e.g., $9.99)
- Yearly (e.g., $99.99)
Copy the two Price IDs into backend/.env as STRIPE_MONTHLY_PLAN_PRICE_ID and STRIPE_YEARLY_PLAN_PRICE_ID.

2) Webhooks
- The backend expects Stripe events at: POST /api/webhooks/stripe
- Easiest during development (Stripe CLI):
	```bash
	stripe listen --forward-to localhost:8000/api/webhooks/stripe
	```
	Copy the Webhook Signing Secret into STRIPE_WEBHOOK_SECRET.

3) Customer portal (manage/cancel)
- In Stripe Dashboard → Billing → Customer portal, enable the portal and default settings.

How billing works here:
- New users start with a local free trial (TRIAL_DAYS). No Stripe subscription is created on signup.
- When they upgrade, Stripe Checkout creates the subscription. The app updates immediately via a read‑time sync and via webhooks.
- Users can switch monthly ↔ yearly and manage their plan in the portal.

---

## Common tasks

- Change app name/logo
	- Title: client/index.html
	- Favicon/logo: place an image in client/public and reference it as `/YourLogo.png` in index.html
	- In-app logo: import an asset from client/src/assets or use `/public` path

- Receipt OCR with AI
	- Set GEMINI_API_KEY and enable the feature in the UI where available

- Email reports
	- Set RESEND_API_KEY and RESEND_MAILER_SENDER. Reports are scheduled by server cron in development mode and on your host in production.

---

## Deployment notes

What you need:
- Hosted MongoDB (Atlas)
- A Node host for the backend (Render/Railway/Fly/Heroku) and a static host for the client (Vercel/Netlify)

Configure:
- Backend .env: set FRONTEND_ORIGIN to your deployed frontend URL
- Client .env: set VITE_API_URL to your deployed backend base URL (e.g., https://api.yourdomain.com/api)
- Stripe webhook endpoint: https://api.yourdomain.com/api/webhooks/stripe

Tips:
- Keep your Stripe keys and webhook secret safe; never commit .env files
- If the billing page doesn’t flip to “Pro” right away, verify the webhook and price IDs

---

## Troubleshooting

- “Subscription status Unknown” or still shows Free Trial after paying
	- Refresh once; then confirm the CLI/webhook points to /api/webhooks/stripe
	- Check STRIPE_MONTHLY_PLAN_PRICE_ID / STRIPE_YEARLY_PLAN_PRICE_ID

- Plan switch takes a few seconds
	- That’s normal as Stripe processes proration. The app polls and updates automatically.

- CORS or auth errors locally
	- Ensure FRONTEND_ORIGIN=http://localhost:5173 in backend/.env and VITE_API_URL points to your backend

---

## License

This code is free for personal use. A commercial license is required for business use.

- License details: [TECHWITHEMMA-LICENSE.md](./TECHWITHEMMA-LICENSE.md)
- Purchase a license: https://techwithemma.gumroad.com/l/huytmd

---

If you have questions or run into setup issues, open an issue with the exact error and your environment (OS, Node version), and we’ll help you get unstuck.
