import { BillingStripeError } from './errors'
import type {
  BillingCustomer,
  BillingSubscriptionRecord,
  StripeEventRecord,
  SubscriptionCache
} from './models'
import type { BillingStorage } from './storage/interface'
import { getStripeConfig } from '../../config/stripe'

type StripeCustomer = {
  id: string
}

type StripeCheckoutSession = {
  id: string
  url: string | null
}

type StripePortalSession = {
  id: string
  url: string | null
}

type StripePaymentMethod = {
  card?: {
    brand?: string
    last4?: string
  }
}

type StripeSubscriptionItem = {
  price?: {
    id?: string
  }
}

type StripeSubscription = {
  id: string
  status?: string
  current_period_start?: number
  current_period_end?: number
  cancel_at_period_end?: boolean
  start_date?: number
  items?: { data?: StripeSubscriptionItem[] }
  default_payment_method?: StripePaymentMethod | null
}

type StripeSubscriptionList = {
  data?: StripeSubscription[]
}

type StripeEvent = {
  id: string
  type: string
  data?: {
    object?: {
      customer?: string
    }
  }
}

export type BillingService = {
  getOrCreateCustomer: (userId: string, email: string | null) => Promise<BillingCustomer>
  createCheckoutSession: (userId: string, email: string | null, priceId: string) => Promise<string>
  createPortalSession: (userId: string, returnUrl: string) => Promise<string>
  syncSubscriptionData: (stripeCustomerId: string) => Promise<SubscriptionCache | null>
  recordStripeEvent: (event: StripeEvent) => Promise<void>
  getSubscriptionForUser: (userId: string) => Promise<SubscriptionCache | null>
  hasActiveSubscription: (userId: string) => Promise<boolean>
  getTier: (userId: string) => Promise<string | null>
}

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

export const createBillingService = (storage: BillingStorage): BillingService => {
  const stripeConfig = getStripeConfig()

  const getOrCreateCustomer = async (userId: string, email: string | null) => {
    const existing = await storage.getCustomerByUserId(userId)
    if (existing) {
      return existing
    }

    const customer = await stripeRequest<StripeCustomer>('/customers', {
      method: 'POST',
      body: toFormData({
        email: email ?? undefined,
        'metadata[user_id]': userId
      })
    })

    const record: BillingCustomer = {
      id: crypto.randomUUID(),
      userId,
      stripeCustomerId: customer.id,
      createdAt: new Date().toISOString()
    }

    await storage.createCustomer(record)
    return record
  }

  const createCheckoutSession = async (userId: string, email: string | null, priceId: string) => {
    const customer = await getOrCreateCustomer(userId, email)
    const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
      method: 'POST',
      body: toFormData({
        mode: 'subscription',
        customer: customer.stripeCustomerId,
        success_url: stripeConfig.successUrl,
        cancel_url: stripeConfig.cancelUrl,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1'
      })
    })

    if (!session.url) {
      throw new BillingStripeError('Stripe checkout session did not return a URL')
    }

    return session.url
  }

  const createPortalSession = async (userId: string, returnUrl: string) => {
    const customer = await storage.getCustomerByUserId(userId)
    if (!customer) {
      throw new BillingStripeError('Customer not found')
    }

    const session = await stripeRequest<StripePortalSession>('/billing_portal/sessions', {
      method: 'POST',
      body: toFormData({
        customer: customer.stripeCustomerId,
        return_url: returnUrl
      })
    })

    if (!session.url) {
      throw new BillingStripeError('Stripe portal session did not return a URL')
    }

    return session.url
  }

  const syncSubscriptionData = async (stripeCustomerId: string) => {
    const customer = await storage.getCustomerByStripeId(stripeCustomerId)
    if (!customer) {
      return null
    }

    const subscriptionList = await stripeRequest<StripeSubscriptionList>(
      `/subscriptions?customer=${encodeURIComponent(stripeCustomerId)}&status=all&limit=1&expand[]=data.default_payment_method`,
      { method: 'GET' }
    )

    const subscription = subscriptionList.data?.[0] ?? null
    const nowIso = new Date().toISOString()

    if (!subscription) {
      await storage.closeActiveSubscriptionRecord(customer.id, nowIso)
      const emptyCache: SubscriptionCache = {
        customerId: customer.id,
        stripeSubscriptionId: null,
        status: 'inactive',
        tierKey: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: null,
        paymentMethodBrand: null,
        paymentMethodLast4: null,
        updatedAt: nowIso
      }
      await storage.upsertSubscriptionCache(emptyCache)
      return emptyCache
    }

    const stripePriceId = subscription.items?.data?.[0]?.price?.id ?? null
    const tierKey = stripePriceId ? stripeConfig.priceMap[stripePriceId] ?? null : null
    const currentPeriodStart = subscription.current_period_start
      ? toIso(subscription.current_period_start)
      : null
    const currentPeriodEnd = subscription.current_period_end
      ? toIso(subscription.current_period_end)
      : null
    const startedAt = subscription.start_date ? toIso(subscription.start_date) : currentPeriodStart
    const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? null

    const activeRecord = await storage.getActiveSubscriptionRecord(customer.id)
    const recordMatches =
      activeRecord?.stripeSubscriptionId === subscription.id &&
      activeRecord?.status === (subscription.status ?? null) &&
      activeRecord?.stripePriceId === stripePriceId &&
      activeRecord?.currentPeriodStart === currentPeriodStart &&
      activeRecord?.currentPeriodEnd === currentPeriodEnd

    if (!recordMatches) {
      await storage.closeActiveSubscriptionRecord(customer.id, nowIso)

      const record: BillingSubscriptionRecord = {
        id: crypto.randomUUID(),
        customerId: customer.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId,
        tierKey,
        status: subscription.status ?? null,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        startedAt,
        endedAt: null,
        createdAt: nowIso
      }

      await storage.createSubscriptionRecord(record)
    }

    const paymentMethod = subscription.default_payment_method?.card
    const cache: SubscriptionCache = {
      customerId: customer.id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status ?? null,
      tierKey,
      stripePriceId,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      paymentMethodBrand: paymentMethod?.brand ?? null,
      paymentMethodLast4: paymentMethod?.last4 ?? null,
      updatedAt: nowIso
    }

    await storage.upsertSubscriptionCache(cache)
    return cache
  }

  const recordStripeEvent = async (event: StripeEvent) => {
    const existing = await storage.getStripeEventByStripeId(event.id)
    if (existing) {
      return
    }

    const stripeCustomerId = event.data?.object?.customer ?? null
    const customer = stripeCustomerId
      ? await storage.getCustomerByStripeId(stripeCustomerId)
      : null

    const record: StripeEventRecord = {
      id: crypto.randomUUID(),
      stripeEventId: event.id,
      type: event.type,
      customerId: customer?.id ?? null,
      rawPayload: event as Record<string, unknown>,
      createdAt: new Date().toISOString()
    }

    await storage.createStripeEvent(record)

    if (stripeCustomerId) {
      await syncSubscriptionData(stripeCustomerId)
    }
  }

  const getSubscriptionForUser = async (userId: string) => {
    const customer = await storage.getCustomerByUserId(userId)
    if (!customer) {
      return null
    }

    return storage.getSubscriptionCacheByCustomerId(customer.id)
  }

  const hasActiveSubscription = async (userId: string) => {
    const cache = await getSubscriptionForUser(userId)
    return cache?.status === 'active' || cache?.status === 'trialing'
  }

  const getTier = async (userId: string) => {
    const cache = await getSubscriptionForUser(userId)
    return cache?.tierKey ?? null
  }

  const stripeRequest = async <T>(path: string, init: RequestInit) => {
    const response = await fetch(`${STRIPE_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${stripeConfig.secretKey}`,
        ...(init.method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(init.headers ?? {})
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new BillingStripeError(`Stripe request failed (${response.status}): ${errorText}`)
    }

    return (await response.json()) as T
  }

  return {
    getOrCreateCustomer,
    createCheckoutSession,
    createPortalSession,
    syncSubscriptionData,
    recordStripeEvent,
    getSubscriptionForUser,
    hasActiveSubscription,
    getTier
  }
}

const toFormData = (values: Record<string, string | undefined>) => {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      body.append(key, value)
    }
  }
  return body
}

const toIso = (timestampSeconds: number) => {
  return new Date(timestampSeconds * 1000).toISOString()
}

