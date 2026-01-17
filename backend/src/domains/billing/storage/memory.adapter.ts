import type { BillingStorage } from './interface'
import type {
  BillingCustomer,
  BillingSubscriptionRecord,
  StripeEventRecord,
  SubscriptionCache
} from '../models'

export class InMemoryBillingStorageAdapter implements BillingStorage {
  private customers = new Map<string, BillingCustomer>()
  private customersByStripeId = new Map<string, BillingCustomer>()
  private subscriptionRecords = new Map<string, BillingSubscriptionRecord[]>()
  private stripeEvents = new Map<string, StripeEventRecord>()
  private subscriptionCache = new Map<string, SubscriptionCache>()

  async getCustomerByUserId(userId: string) {
    return this.customers.get(userId) ?? null
  }

  async getCustomerByStripeId(stripeCustomerId: string) {
    return this.customersByStripeId.get(stripeCustomerId) ?? null
  }

  async createCustomer(customer: BillingCustomer) {
    this.customers.set(customer.userId, customer)
    this.customersByStripeId.set(customer.stripeCustomerId, customer)
  }

  async getActiveSubscriptionRecord(customerId: string) {
    const records = this.subscriptionRecords.get(customerId) ?? []
    return records.find((record) => record.endedAt === null) ?? null
  }

  async closeActiveSubscriptionRecord(customerId: string, endedAt: string) {
    const records = this.subscriptionRecords.get(customerId) ?? []
    const updated = records.map((record) =>
      record.endedAt === null ? { ...record, endedAt } : record
    )
    this.subscriptionRecords.set(customerId, updated)
  }

  async createSubscriptionRecord(record: BillingSubscriptionRecord) {
    const records = this.subscriptionRecords.get(record.customerId) ?? []
    records.push(record)
    this.subscriptionRecords.set(record.customerId, records)
  }

  async getStripeEventByStripeId(stripeEventId: string) {
    return this.stripeEvents.get(stripeEventId) ?? null
  }

  async createStripeEvent(record: StripeEventRecord) {
    this.stripeEvents.set(record.stripeEventId, record)
  }

  async upsertSubscriptionCache(cache: SubscriptionCache) {
    this.subscriptionCache.set(cache.customerId, cache)
  }

  async getSubscriptionCacheByCustomerId(customerId: string) {
    return this.subscriptionCache.get(customerId) ?? null
  }
}

