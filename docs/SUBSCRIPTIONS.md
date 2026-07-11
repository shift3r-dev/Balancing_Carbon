# Subscription And Pricing Architecture

## Flow

```mermaid
flowchart LR
  Organisation --> Subscription
  Subscription --> Plan
  Plan --> Features[plan_features]
  Plan --> Limits[plan_limits]
  Subscription --> History[subscription_history]
  Subscription --> Events[subscription_events]
  Usage[Current operational counts] --> Subscription
```

`007_subscription_pricing.sql` is database-driven and does not call a payment provider or enforce plan limits. It backfills every organisation with a live Starter subscription.

Run `008_plan_feature_inheritance.sql` after `007`. It makes Professional include Starter capabilities and Enterprise include Professional and Starter capabilities. For an existing database that already ran the earlier Phase 3 migrations, also run `012_phase3_pricing_finalization.sql`.

## Plan Data

The public catalog contains Starter, Professional, and Enterprise, each with one organisation. Enterprise+ is archived and excluded from the public catalog; it remains in the database solely to preserve historical records. Features and limits are read from `plan_features` and `plan_limits`; the frontend does not define a plan matrix.

## Commercial Catalog

| Plan | Monthly | Yearly | Trial |
| --- | ---: | ---: | --- |
| Starter | INR 4,999 | INR 49,990 | 14 days |
| Professional | INR 14,999 | INR 149,990 | 14 days |
| Enterprise | INR 49,999 | INR 499,990 | 14 days |

Annual pricing is approximately 17% lower than paying monthly for twelve months. Prices are stored only in `plans`, formatted by the client, and can be changed later without redeploying the application.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/plans` | Public active plan catalog |
| GET | `/api/subscription` | Current organisation subscription |
| GET | `/api/subscription/usage` | Informational current usage |
| GET | `/api/subscription/features` | Current plan features and limits |
| POST | `/api/subscription/upgrade` | State-only plan change |
| POST | `/api/subscription/cancel` | State-only cancellation |
| POST | `/api/subscription/renew` | State-only renewal |

Subscription actions require the existing database permission `subscription.manage`. Every action is recorded in `subscription_history` and `subscription_events`.

## Future Billing Boundary

Future providers such as Stripe, Razorpay, Paddle, and LemonSqueezy should translate verified provider events into the existing subscription history/event model. Do not trust a browser callback to activate a subscription. Feature-gate enforcement begins only in Phase 4.
