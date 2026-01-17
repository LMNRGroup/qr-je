import { getSupabaseAdminConfig } from '../../../config/supabase'
import type {
  BillingCustomer,
  BillingSubscriptionRecord,
  StripeEventRecord,
  SubscriptionCache
} from '../models'
import type { BillingStorage } from './interface'

type BillingCustomerRow = {
  id: string
  user_id: string
  stripe_customer_id: string
  created_at: string
}

type BillingSubscriptionRecordRow = {
  id: string
  customer_id: string
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  tier_key: string | null
  status: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

type StripeEventRecordRow = {
  id: string
  stripe_event_id: string
  type: string
  customer_id: string | null
  raw_payload: Record<string, unknown>
  created_at: string
}

type SubscriptionCacheRow = {
  customer_id: string
  stripe_subscription_id: string | null
  status: string | null
  tier_key: string | null
  stripe_price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  payment_method_brand: string | null
  payment_method_last4: string | null
  updated_at: string
}

export class SupabaseBillingStorageAdapter implements BillingStorage {
  private readonly restUrl: string
  private readonly serviceRoleKey: string

  constructor() {
    const { restUrl, serviceRoleKey } = getSupabaseAdminConfig()
    this.restUrl = restUrl
    this.serviceRoleKey = serviceRoleKey
  }

  async getCustomerByUserId(userId: string) {
    const rows = await this.requestJson<BillingCustomerRow[]>(
      `billing_customers?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`
    )
    return rows[0] ? this.mapCustomer(rows[0]) : null
  }

  async getCustomerByStripeId(stripeCustomerId: string) {
    const rows = await this.requestJson<BillingCustomerRow[]>(
      `billing_customers?select=*&stripe_customer_id=eq.${encodeURIComponent(stripeCustomerId)}&limit=1`
    )
    return rows[0] ? this.mapCustomer(rows[0]) : null
  }

  async createCustomer(customer: BillingCustomer) {
    await this.request('billing_customers', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: customer.id,
        user_id: customer.userId,
        stripe_customer_id: customer.stripeCustomerId,
        created_at: customer.createdAt
      })
    })
  }

  async getActiveSubscriptionRecord(customerId: string) {
    const rows = await this.requestJson<BillingSubscriptionRecordRow[]>(
      `billing_subscription_records?select=*&customer_id=eq.${encodeURIComponent(customerId)}&ended_at=is.null&order=created_at.desc&limit=1`
    )
    return rows[0] ? this.mapSubscriptionRecord(rows[0]) : null
  }

  async closeActiveSubscriptionRecord(customerId: string, endedAt: string) {
    await this.request(`billing_subscription_records?customer_id=eq.${encodeURIComponent(customerId)}&ended_at=is.null`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ended_at: endedAt })
    })
  }

  async createSubscriptionRecord(record: BillingSubscriptionRecord) {
    await this.request('billing_subscription_records', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: record.id,
        customer_id: record.customerId,
        stripe_subscription_id: record.stripeSubscriptionId,
        stripe_price_id: record.stripePriceId,
        tier_key: record.tierKey,
        status: record.status,
        current_period_start: record.currentPeriodStart,
        current_period_end: record.currentPeriodEnd,
        cancel_at_period_end: record.cancelAtPeriodEnd,
        started_at: record.startedAt,
        ended_at: record.endedAt,
        created_at: record.createdAt
      })
    })
  }

  async getStripeEventByStripeId(stripeEventId: string) {
    const rows = await this.requestJson<StripeEventRecordRow[]>(
      `billing_stripe_event_records?select=*&stripe_event_id=eq.${encodeURIComponent(stripeEventId)}&limit=1`
    )
    return rows[0] ? this.mapStripeEvent(rows[0]) : null
  }

  async createStripeEvent(record: StripeEventRecord) {
    await this.request('billing_stripe_event_records', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: record.id,
        stripe_event_id: record.stripeEventId,
        type: record.type,
        customer_id: record.customerId,
        raw_payload: record.rawPayload,
        created_at: record.createdAt
      })
    })
  }

  async upsertSubscriptionCache(cache: SubscriptionCache) {
    await this.request('billing_subscription_cache?on_conflict=customer_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        customer_id: cache.customerId,
        stripe_subscription_id: cache.stripeSubscriptionId,
        status: cache.status,
        tier_key: cache.tierKey,
        stripe_price_id: cache.stripePriceId,
        current_period_start: cache.currentPeriodStart,
        current_period_end: cache.currentPeriodEnd,
        cancel_at_period_end: cache.cancelAtPeriodEnd,
        payment_method_brand: cache.paymentMethodBrand,
        payment_method_last4: cache.paymentMethodLast4,
        updated_at: cache.updatedAt
      })
    })
  }

  async getSubscriptionCacheByCustomerId(customerId: string) {
    const rows = await this.requestJson<SubscriptionCacheRow[]>(
      `billing_subscription_cache?select=*&customer_id=eq.${encodeURIComponent(customerId)}&limit=1`
    )
    return rows[0] ? this.mapSubscriptionCache(rows[0]) : null
  }

  private mapCustomer(row: BillingCustomerRow): BillingCustomer {
    return {
      id: row.id,
      userId: row.user_id,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: row.created_at
    }
  }

  private mapSubscriptionRecord(row: BillingSubscriptionRecordRow): BillingSubscriptionRecord {
    return {
      id: row.id,
      customerId: row.customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripePriceId: row.stripe_price_id,
      tierKey: row.tier_key,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      createdAt: row.created_at
    }
  }

  private mapStripeEvent(row: StripeEventRecordRow): StripeEventRecord {
    return {
      id: row.id,
      stripeEventId: row.stripe_event_id,
      type: row.type,
      customerId: row.customer_id,
      rawPayload: row.raw_payload,
      createdAt: row.created_at
    }
  }

  private mapSubscriptionCache(row: SubscriptionCacheRow): SubscriptionCache {
    return {
      customerId: row.customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      status: row.status,
      tierKey: row.tier_key,
      stripePriceId: row.stripe_price_id,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      paymentMethodBrand: row.payment_method_brand,
      paymentMethodLast4: row.payment_method_last4,
      updatedAt: row.updated_at
    }
  }

  private async request(path: string, init?: RequestInit) {
    const response = await fetch(`${this.restUrl}/${path}`, {
      ...init,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Supabase request failed (${response.status}): ${errorText}`)
    }

    return response
  }

  private async requestJson<T>(path: string, init?: RequestInit) {
    const response = await this.request(path, init)
    return (await response.json()) as T
  }
}

