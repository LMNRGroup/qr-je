import { BillingCustomer, BillingSubscriptionRecord, StripeEventRecord, SubscriptionCache } from '../models'

export type BillingStorage = {
  getCustomerByUserId: (userId: string) => Promise<BillingCustomer | null>
  getCustomerByStripeId: (stripeCustomerId: string) => Promise<BillingCustomer | null>
  createCustomer: (customer: BillingCustomer) => Promise<void>
  getActiveSubscriptionRecord: (customerId: string) => Promise<BillingSubscriptionRecord | null>
  closeActiveSubscriptionRecord: (customerId: string, endedAt: string) => Promise<void>
  createSubscriptionRecord: (record: BillingSubscriptionRecord) => Promise<void>
  getStripeEventByStripeId: (stripeEventId: string) => Promise<StripeEventRecord | null>
  createStripeEvent: (record: StripeEventRecord) => Promise<void>
  upsertSubscriptionCache: (cache: SubscriptionCache) => Promise<void>
  getSubscriptionCacheByCustomerId: (customerId: string) => Promise<SubscriptionCache | null>
}

