import type { BillingRecord, UpsertBillingRecordInput } from '../models'

export type BillingStorage = {
  getByUserId: (userId: string) => Promise<BillingRecord | null>
  getByStripeCustomerId: (stripeCustomerId: string) => Promise<BillingRecord | null>
  upsert: (input: UpsertBillingRecordInput) => Promise<BillingRecord>
}
