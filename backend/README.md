To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

## Stripe billing

Billing uses Stripe Checkout for Pro and Command subscriptions. Create recurring Stripe Prices for
both plans, enable Stripe's "limit customers to one subscription" setting for the Checkout flow,
then set these backend environment values:

```sh
WEB_APP_BASE_URL=http://localhost:8080
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_COMMAND_PRICE_ID=price_...
```

Expose `POST /billing/webhook` to Stripe and subscribe it to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `customer.subscription.pending_update_applied`
- `customer.subscription.pending_update_expired`
- `customer.subscription.trial_will_end`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.upcoming`
- `invoice.marked_uncollectible`
- `invoice.payment_succeeded`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

For local webhook testing, run the backend and forward Stripe CLI events to
`http://localhost:3000/billing/webhook`. Stripe prints the `whsec_...` value needed for
`STRIPE_WEBHOOK_SECRET`.

The API creates and stores the Stripe customer before opening Checkout. It refreshes subscription
state by Stripe customer ID after Checkout returns to `/billing/success` and when billing webhooks
arrive. The current subscription plan controls dynamic QR limits: Free allows 1 dynamic QR code,
Pro allows 25, and Command is unlimited. Adaptive QRC limits are 1 for Free and Pro and 5 for
Command.
