export type BillingPlan = 'free' | 'pro' | 'command'

export type BillingRecord = {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string | null
  billingPlan: BillingPlan
  billingStatus: string | null
  billingPriceId: string | null
  createdAt: string
  updatedAt: string
}

export type UpsertBillingRecordInput = {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId?: string | null
  billingPlan?: BillingPlan
  billingStatus?: string | null
  billingPriceId?: string | null
}
