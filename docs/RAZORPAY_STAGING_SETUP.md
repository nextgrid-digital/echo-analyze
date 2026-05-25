# Razorpay setup checklist (Staging)

Use this checklist when enabling **₹2,000/month + 18% GST (₹2,360 total)** on the **Staging** deployment only. Portfolio analysis code is unchanged; billing lives under `/billing` and `/api/payments/*`.

## Pricing

| Item | Value |
|------|--------|
| Base | ₹2,000 / month |
| GST (18%) | ₹360 |
| **Total charged** | **₹2,360** |
| Paise for env | `236000` |

The Razorpay **plan amount** and `RAZORPAY_DEFAULT_AMOUNT_PAISE` must both be **₹2,360**.

---

## 1. Razorpay Dashboard

- [ ] Sign in at [dashboard.razorpay.com](https://dashboard.razorpay.com)
- [ ] **Test mode** first (toggle top-left), then switch to **Live** when ready
- [ ] **Settings → API Keys**: copy **Key ID** (`rzp_test_…` or `rzp_live_…`) and **Key Secret**

### Monthly plan (required for subscriptions)

- [ ] **Subscriptions → Plans → New Plan**
- [ ] Period: **Monthly**, interval **1**
- [ ] Amount: **₹2,360** (inclusive of 18% GST)
- [ ] Copy **`plan_id`** (e.g. `plan_xxxxxxxx`)

### Webhook (recommended)

- [ ] **Settings → Webhooks → Add new webhook**
- [ ] URL: `https://<YOUR-STAGING-HOST>/api/payments/webhook`
- [ ] Events (at minimum):
  - `subscription.charged`
  - `subscription.completed`
  - `subscription.cancelled`
  - `payment.failed`
- [ ] Copy **Webhook secret** → `RAZORPAY_WEBHOOK_SECRET`

---

## 2. Staging environment variables

Set these on the **Staging** Vercel project (or local `.env` for testing). Do **not** put `RAZORPAY_KEY_SECRET` in the frontend build.

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_PLAN_ID=plan_xxxxxxxx
RAZORPAY_DEFAULT_AMOUNT_PAISE=236000
RAZORPAY_CURRENCY=INR
RAZORPAY_PLAN_DESCRIPTION=Echo Analyze — Rs 2,000/month + 18% GST (Rs 2,360 total)
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxx
RAZORPAY_SUBSCRIPTION_TOTAL_COUNT=12
```

Clerk (required for checkout — subscriptions are tied to signed-in users):

```env
CLERK_SECRET_KEY=...
VITE_CLERK_PUBLISHABLE_KEY=...
```

- [ ] All Razorpay vars saved on Staging
- [ ] Redeploy **Staging** after changing env vars

---

## 3. Smoke test after deploy

- [ ] Open `https://<YOUR-STAGING-HOST>/api/payments/config`  
  Expect JSON with `"enabled": true`, `"key_id": "rzp_…"`, `"plan_id": "plan_…"`, `"default_amount_paise": 236000`
- [ ] Sign in with Clerk
- [ ] Open `https://<YOUR-STAGING-HOST>/billing`
- [ ] Price shows **₹2,360 / month** and GST breakdown (₹2,000 base + ₹360 GST)
- [ ] Click **Subscribe monthly** → Razorpay checkout opens
- [ ] Complete payment (test card in test mode)
- [ ] No error after redirect; payment verified via `/api/payments/verify-payment`

### Test card (Razorpay test mode)

Use [Razorpay test cards](https://razorpay.com/docs/payments/payments/test-card-details/) from their docs (e.g. successful Visa test numbers in test mode only).

---

## 4. Verify webhook (optional)

- [ ] In Razorpay dashboard → Webhook → send test `subscription.charged`
- [ ] Staging logs show `200` for `POST /api/payments/webhook`
- [ ] Event appears in admin audit log (`/admin`) if enabled

---

## 5. Go live

- [ ] Create **live** API keys and a **live** monthly plan at **₹2,360**
- [ ] Update Staging env to `rzp_live_…` keys and live `plan_id`
- [ ] Update webhook URL to production Staging host (HTTPS)
- [ ] Run one real ₹2,360 subscription and confirm auto-renewal next month in Razorpay dashboard

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/billing` says payments not configured | Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; redeploy |
| Subscribe button error: no plan | Set `RAZORPAY_PLAN_ID` to your dashboard `plan_…` |
| Amount mismatch at checkout | Plan amount in dashboard must be **₹2,360**; env `RAZORPAY_DEFAULT_AMOUNT_PAISE=236000` |
| Checkout does not open | Sign in with Clerk; check browser console; allow `checkout.razorpay.com` (CSP is already configured in the app) |
| Webhook 401/400 | Set `RAZORPAY_WEBHOOK_SECRET` to match dashboard; URL must be exact Staging host + `/api/payments/webhook` |

---

## API reference (Staging backend)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/payments/config` | Public | Key id, plan id, amount for UI |
| `POST /api/payments/create-subscription` | Clerk | Start monthly subscription |
| `POST /api/payments/create-order` | Clerk | One-time ₹2,360 charge |
| `POST /api/payments/verify-payment` | Clerk | Verify checkout signature |
| `POST /api/payments/webhook` | Razorpay HMAC | Renewal / failure events |

See also `README.md` → **Razorpay Billing** and `.env.example`.
