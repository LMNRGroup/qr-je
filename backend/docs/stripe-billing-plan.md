# Stripe Billing Implementation Plan

## Architecture

Append-only event model + a subscription cache for current state. A single
`syncSubscriptionData()` function is the source of truth, called from both the
success redirect (`/billing/sync`) and Stripe webhooks.

## Database Tables

```sql
-- User to Stripe customer mapping
billing_customers (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ
)

-- Append-only subscription records
billing_subscription_records (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES billing_customers(id),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  tier_key VARCHAR(50),
  status VARCHAR(50),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)

-- Idempotency + audit trail
billing_stripe_event_records (
  id UUID PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE,
  type VARCHAR(255),
  customer_id UUID,
  raw_payload JSONB,
  created_at TIMESTAMPTZ
)
```

## Current State Cache (Postgres)

```sql
billing_subscription_cache (
  customer_id UUID PRIMARY KEY REFERENCES billing_customers(id),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50),
  tier_key VARCHAR(50),
  stripe_price_id VARCHAR(255),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  payment_method_brand VARCHAR(50),
  payment_method_last4 VARCHAR(4),
  updated_at TIMESTAMPTZ
)
```

## Core Flow

```
1. User clicks "Subscribe"
2. Backend: getOrCreateCustomer(userId, email)
   - Check DB mapping
   - Create Stripe customer if missing
   - Store in billing_customers
3. Backend: createCheckoutSession(stripeCustomerId, priceId)
   - Always pass `customer`
4. User completes payment, redirects to /billing/sync
5. Backend: syncSubscriptionData(stripeCustomerId)
   - Fetch subscription from Stripe
   - Close previous record (ended_at)
   - Insert new subscription record
   - Upsert cache row
6. Webhook arrives (before or after step 5)
   - Verify signature
   - Check idempotency (skip if processed)
   - Store raw event
   - Call syncSubscriptionData(stripeCustomerId)
```

## Endpoints

```
POST /billing/checkout-session  { price_id } -> { url }
POST /billing/portal-session    { return_url } -> { url }
POST /billing/webhooks/stripe   (Stripe webhook)
GET  /billing/sync              (call after checkout success)
GET  /billing/subscription      (current state from cache)
```

## Webhook Events to Track

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
invoice.paid
invoice.payment_failed
invoice.payment_succeeded
```

## Environment Variables

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO
STRIPE_PRICE_PREMIUM
STRIPE_SUCCESS_URL
STRIPE_CANCEL_URL
```

## Stripe Dashboard Settings

- Enable “Limit customers to one subscription”
- Disable “Cash App Pay” (higher fraud)
- Configure the webhook endpoint with the events listed above

