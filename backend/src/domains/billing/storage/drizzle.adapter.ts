import { eq, sql } from 'drizzle-orm'

import { db } from '../../../infra/db/postgres.db'
import { billingRecords } from '../../../infra/db/schema'
import type { BillingPlan, UpsertBillingRecordInput } from '../models'
import type { BillingStorage } from './interface'

let billingTableEnsured = false
let billingTablePromise: Promise<void> | null = null

const ensureBillingTable = async () => {
  if (billingTableEnsured) return
  if (!billingTablePromise) {
    billingTablePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "billing_records" (
          "user_id" text PRIMARY KEY REFERENCES "users"("id") ON DELETE cascade,
          "stripe_customer_id" text NOT NULL,
          "stripe_subscription_id" text,
          "billing_plan" text NOT NULL DEFAULT 'free',
          "billing_status" text,
          "billing_price_id" text,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now()
        )
      `)
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "billing_records_stripe_customer_idx" ON "billing_records" ("stripe_customer_id")`)
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "billing_records_subscription_idx" ON "billing_records" ("stripe_subscription_id")`)
      billingTableEnsured = true
    })().catch((error) => {
      billingTablePromise = null
      throw error
    })
  }

  await billingTablePromise
}

const isMissingBillingTable = (error: unknown) => {
  const message = error instanceof Error ? error.message : ''
  return message.includes('billing_records')
}

const withBillingTable = async <T>(task: () => Promise<T>) => {
  try {
    return await task()
  } catch (error) {
    if (isMissingBillingTable(error)) {
      await ensureBillingTable()
      return await task()
    }

    throw error
  }
}

export class DrizzleBillingStorageAdapter implements BillingStorage {
  async getByUserId(userId: string) {
    const rows = await withBillingTable(() =>
      db.select().from(billingRecords).where(eq(billingRecords.userId, userId)).limit(1)
    )

    return rows[0] ? this.toDomain(rows[0]) : null
  }

  async getByStripeCustomerId(stripeCustomerId: string) {
    const rows = await withBillingTable(() =>
      db
        .select()
        .from(billingRecords)
        .where(eq(billingRecords.stripeCustomerId, stripeCustomerId))
        .limit(1)
    )

    return rows[0] ? this.toDomain(rows[0]) : null
  }

  async upsert(input: UpsertBillingRecordInput) {
    const now = new Date()
    const rows = await withBillingTable(() =>
      db
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
    )

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
