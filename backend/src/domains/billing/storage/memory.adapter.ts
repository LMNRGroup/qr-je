import type { BillingRecord, UpsertBillingRecordInput } from '../models'
import type { BillingStorage } from './interface'

export class InMemoryBillingStorageAdapter implements BillingStorage {
  private readonly records = new Map<string, BillingRecord>()

  async getByUserId(userId: string) {
    return this.records.get(userId) ?? null
  }

  async getByStripeCustomerId(stripeCustomerId: string) {
    for (const record of this.records.values()) {
      if (record.stripeCustomerId === stripeCustomerId) {
        return record
      }
    }

    return null
  }

  async upsert(input: UpsertBillingRecordInput) {
    const existing = this.records.get(input.userId)
    const now = new Date().toISOString()
    const record: BillingRecord = {
      userId: input.userId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId ?? existing?.stripeSubscriptionId ?? null,
      billingPlan: input.billingPlan ?? existing?.billingPlan ?? 'free',
      billingStatus: input.billingStatus ?? existing?.billingStatus ?? null,
      billingPriceId: input.billingPriceId ?? existing?.billingPriceId ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    this.records.set(record.userId, record)
    return record
  }
}
