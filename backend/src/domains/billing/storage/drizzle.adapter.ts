import { eq } from 'drizzle-orm'

import { db } from '../../../infra/db/postgres.db'
import { billingRecords } from '../../../infra/db/schema'
import type { BillingPlan, UpsertBillingRecordInput } from '../models'
import type { BillingStorage } from './interface'

export class DrizzleBillingStorageAdapter implements BillingStorage {
  async getByUserId(userId: string) {
    const rows = await db.select().from(billingRecords).where(eq(billingRecords.userId, userId)).limit(1)

    return rows[0] ? this.toDomain(rows[0]) : null
  }

  async getByStripeCustomerId(stripeCustomerId: string) {
    const rows = await db
      .select()
      .from(billingRecords)
      .where(eq(billingRecords.stripeCustomerId, stripeCustomerId))
      .limit(1)

    return rows[0] ? this.toDomain(rows[0]) : null
  }

  async upsert(input: UpsertBillingRecordInput) {
    const now = new Date()
    const rows = await db
        .insert(billingRecords)
        .values({
          userId: input.userId,
          stripeCustomerId: input.stripeCustomerId,
          stripeSubscriptionId: input.stripeSubscriptionId ?? null,
          billingPlan: input.billingPlan ?? 'free',
          billingStatus: input.billingStatus ?? null,
          billingPriceId: input.billingPriceId ?? null,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: billingRecords.userId,
          set: {
            stripeCustomerId: input.stripeCustomerId,
            stripeSubscriptionId: input.stripeSubscriptionId ?? null,
            billingPlan: input.billingPlan ?? 'free',
            billingStatus: input.billingStatus ?? null,
            billingPriceId: input.billingPriceId ?? null,
            updatedAt: now
          }
        })
        .returning()

    if (!rows[0]) {
      throw new Error('Failed to upsert billing record')
    }

    return this.toDomain(rows[0])
  }

  private toDomain(row: typeof billingRecords.$inferSelect) {
    return {
      userId: row.userId,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId ?? null,
      billingPlan: toBillingPlan(row.billingPlan),
      billingStatus: row.billingStatus ?? null,
      billingPriceId: row.billingPriceId ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }
  }
}

const toBillingPlan = (value: string): BillingPlan => {
  return value === 'pro' || value === 'command' ? value : 'free'
}
