export type BillingCustomer = {
  id: string
  userId: string
  stripeCustomerId: string
  createdAt: string
}

export type BillingSubscriptionRecord = {
  id: string
  customerId: string
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  tierKey: string | null
  status: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean | null
  startedAt: string | null
  endedAt: string | null
  createdAt: string
}

export type StripeEventRecord = {
  id: string
  stripeEventId: string
  type: string
  customerId: string | null
  rawPayload: Record<string, unknown>
  createdAt: string
}

export type SubscriptionCache = {
  customerId: string
  stripeSubscriptionId: string | null
  status: string | null
  tierKey: string | null
  stripePriceId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean | null
  paymentMethodBrand: string | null
  paymentMethodLast4: string | null
  updatedAt: string
}

export type CreateCheckoutSessionInput = {
  priceId: string
}

export type CreatePortalSessionInput = {
  returnUrl: string
}

