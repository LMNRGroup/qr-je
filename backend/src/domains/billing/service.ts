import Stripe from 'stripe'

import type { User } from '../users/models'
import type { UsersService } from '../users/service'
import type { BillingPlan, BillingRecord } from './models'
import type { BillingStorage } from './storage/interface'

const ACTIVE_BILLING_STATUSES = new Set(['active', 'trialing'])
const BILLING_SYNC_EVENTS = new Set<Stripe.Event.Type>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.pending_update_applied',
  'customer.subscription.pending_update_expired',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.upcoming',
  'invoice.marked_uncollectible',
  'invoice.payment_succeeded',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled'
])

export const PAID_BILLING_PLANS = ['pro', 'command'] as const

export type PaidBillingPlan = (typeof PAID_BILLING_PLANS)[number]

export type BillingEntitlements = {
  plan: BillingPlan
  dynamicQrCodeLimit: number | null
  adaptiveQrCodeLimit: number
}

export type BillingStatus = BillingEntitlements & {
  subscriptionStatus: string | null
  priceId: string | null
  canManageBilling: boolean
}

export type BillingPlanPrice = {
  plan: PaidBillingPlan
  unitAmount: number
  currency: string
  interval: string | null
}

export type BillingService = {
  createCheckoutSession: (userId: string, plan: PaidBillingPlan) => Promise<string>
  createPortalSession: (userId: string) => Promise<string>
  getStatus: (userId: string) => Promise<BillingStatus>
  getPlans: () => Promise<BillingPlanPrice[]>
  getEntitlements: (userId: string) => Promise<BillingEntitlements>
  syncUser: (userId: string) => Promise<BillingStatus>
  processWebhook: (payload: string, signature: string) => Promise<void>
}

export class BillingConfigurationError extends Error {}
export class BillingNotFoundError extends Error {}
export class BillingConflictError extends Error {}

// Billing is opt-in in every environment so preview builds cannot accidentally
// create live Stripe customers or subscriptions.
export const isBillingFeatureEnabled = () => process.env.BILLING_ENABLED === 'true'

const LEGACY_ENTITLEMENTS: BillingEntitlements = {
  plan: 'free',
  dynamicQrCodeLimit: null,
  adaptiveQrCodeLimit: 1
}

export const createBillingService = (
  usersService: UsersService,
  billingStorage: BillingStorage,
  options: { stripe?: Stripe; enabled?: boolean } = {}
): BillingService => {
  let stripeClient: Stripe | null = options.stripe ?? null
  let planPricesPromise: Promise<BillingPlanPrice[]> | null = null
  const billingEnabled = options.enabled ?? isBillingFeatureEnabled()

  const getStripeClient = () => {
    if (stripeClient) return stripeClient

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new BillingConfigurationError('STRIPE_SECRET_KEY is required')
    }

    stripeClient = new Stripe(secretKey)

    return stripeClient
  }

  const getWebAppBaseUrl = () => {
    const url = process.env.WEB_APP_BASE_URL
    if (!url) {
      throw new BillingConfigurationError('WEB_APP_BASE_URL is required')
    }

    return url.replace(/\/+$/, '')
  }

  const getWebhookSecret = () => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new BillingConfigurationError('STRIPE_WEBHOOK_SECRET is required')
    }

    return webhookSecret
  }

  const getPriceId = (plan: PaidBillingPlan) => {
    const priceId = plan === 'pro'
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_COMMAND_PRICE_ID

    if (!priceId) {
      throw new BillingConfigurationError(`Stripe price ID for ${plan} is required`)
    }

    return priceId
  }

  const getPlanForPrice = (priceId: string | null) => {
    if (priceId && priceId === process.env.STRIPE_PRO_PRICE_ID) {
      return 'pro'
    }

    if (priceId && priceId === process.env.STRIPE_COMMAND_PRICE_ID) {
      return 'command'
    }

    return null
  }

  const getUser = async (userId: string) => {
    const user = await usersService.getById(userId)
    if (!user) {
      throw new BillingNotFoundError('User not found')
    }

    return user
  }

  const getAccessPlan = (billingRecord: BillingRecord | null): BillingPlan => {
    if (!billingRecord || !ACTIVE_BILLING_STATUSES.has(billingRecord.billingStatus ?? '')) {
      return 'free'
    }

    return billingRecord.billingPlan
  }

  const getEntitlementsForPlan = (plan: BillingPlan): BillingEntitlements => {
    if (plan === 'command') {
      return {
        plan,
        dynamicQrCodeLimit: null,
        adaptiveQrCodeLimit: 5
      }
    }

    if (plan === 'pro') {
      return {
        plan,
        dynamicQrCodeLimit: 25,
        adaptiveQrCodeLimit: 1
      }
    }

    return {
      plan: 'free',
      dynamicQrCodeLimit: 1,
      adaptiveQrCodeLimit: 1
    }
  }

  const getStatus = async (userId: string): Promise<BillingStatus> => {
    await getUser(userId)

    if (!billingEnabled) {
      return {
        ...LEGACY_ENTITLEMENTS,
        subscriptionStatus: null,
        priceId: null,
        canManageBilling: false
      }
    }

    const billingRecord = await billingStorage.getByUserId(userId)
    const entitlements = getEntitlementsForPlan(getAccessPlan(billingRecord))

    return {
      ...entitlements,
      subscriptionStatus: billingRecord?.billingStatus ?? null,
      priceId: billingRecord?.billingPriceId ?? null,
      canManageBilling: Boolean(billingRecord?.stripeCustomerId)
    }
  }

  const getEntitlements = async (userId: string) => {
    await getUser(userId)

    if (!billingEnabled) {
      return LEGACY_ENTITLEMENTS
    }

    const billingRecord = await billingStorage.getByUserId(userId)
    return getEntitlementsForPlan(getAccessPlan(billingRecord))
  }

  const createCheckoutSession = async (userId: string, plan: PaidBillingPlan) => {
    if (!billingEnabled) {
      throw new BillingConfigurationError('Billing is not available yet')
    }

    const existingUser = await getUser(userId)
    const user = await ensureStripeCustomer(existingUser)
    const currentStatus = await syncStripeDataForCustomer(user.stripeCustomerId)
    if (currentStatus && currentStatus.plan !== 'free') {
      throw new BillingConflictError('This account already has an active subscription')
    }

    const baseUrl = getWebAppBaseUrl()
    const stripe = getStripeClient()
    const metadata = { userId: user.id, plan }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: getPriceId(plan), quantity: 1 }],
      success_url: `${baseUrl}/billing/success`,
      cancel_url: `${baseUrl}/?billing=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata,
      subscription_data: { metadata },
      customer: user.stripeCustomerId
    })

    if (!session.url) {
      throw new BillingConfigurationError('Stripe Checkout did not return a hosted URL')
    }

    return session.url
  }

  const createPortalSession = async (userId: string) => {
    if (!billingEnabled) {
      throw new BillingConfigurationError('Billing is not available yet')
    }

    await getUser(userId)
    const billingRecord = await billingStorage.getByUserId(userId)
    if (!billingRecord?.stripeCustomerId) {
      throw new BillingNotFoundError('No Stripe customer exists for this account')
    }

    const portalSession = await getStripeClient().billingPortal.sessions.create({
      customer: billingRecord.stripeCustomerId,
      return_url: `${getWebAppBaseUrl()}/?billing=portal-return`
    })

    return portalSession.url
  }

  const readSubscriptionPlan = (subscription: Stripe.Subscription, priceId: string | null) => {
    // Stripe Price IDs are authoritative. Metadata is only a fallback for
    // legacy subscriptions that have no price item at all.
    if (priceId) {
      return getPlanForPrice(priceId)
    }

    const metadataPlan = subscription.metadata.plan
    return isPaidBillingPlan(metadataPlan) ? metadataPlan : null
  }

  const readSubscriptionPriceId = (subscription: Stripe.Subscription) => {
    const priceIds = subscription.items.data.map((item) => item.price.id)
    return priceIds.find((priceId) => getPlanForPrice(priceId) !== null) ?? priceIds[0] ?? null
  }

  const ensureStripeCustomer = async (user: User): Promise<User & { stripeCustomerId: string }> => {
    const existingBillingRecord = await billingStorage.getByUserId(user.id)
    if (existingBillingRecord?.stripeCustomerId) {
      return { ...user, stripeCustomerId: existingBillingRecord.stripeCustomerId }
    }

    const customer = await getStripeClient().customers.create(
      {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { userId: user.id }
      },
      { idempotencyKey: `qrc-stripe-customer-${user.id}` }
    )
    await billingStorage.upsert({
      userId: user.id,
      stripeCustomerId: customer.id,
      billingPlan: 'free',
      billingStatus: null,
      billingPriceId: null,
      stripeSubscriptionId: null
    })

    return { ...user, stripeCustomerId: customer.id }
  }

  const syncStripeDataForCustomer = async (customerId: string): Promise<BillingStatus | null> => {
    const billingRecord = await billingStorage.getByStripeCustomerId(customerId)
    if (!billingRecord) {
      console.warn('[billing] skipped customer sync for unknown Stripe customer', customerId)
      return null
    }

    const subscriptions = await getStripeClient().subscriptions.list({
      customer: customerId,
      limit: 100,
      status: 'all'
    })
    const subscription = selectSubscription(
      subscriptions.data,
      billingRecord.stripeSubscriptionId,
      (candidate) => readSubscriptionPlan(candidate, readSubscriptionPriceId(candidate))
    )
    if (!subscription) {
      await billingStorage.upsert({
        userId: billingRecord.userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        billingPlan: 'free',
        billingStatus: null,
        billingPriceId: null
      })
      return getStatus(billingRecord.userId)
    }

    const priceId = readSubscriptionPriceId(subscription)
    const plan = ACTIVE_BILLING_STATUSES.has(subscription.status)
      ? readSubscriptionPlan(subscription, priceId) ?? 'free'
      : 'free'

    await billingStorage.upsert({
      userId: billingRecord.userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      billingPlan: plan,
      billingStatus: subscription.status,
      billingPriceId: priceId
    })
    return getStatus(billingRecord.userId)
  }

  const syncUser = async (userId: string) => {
    if (!billingEnabled) {
      return getStatus(userId)
    }

    await getUser(userId)
    const billingRecord = await billingStorage.getByUserId(userId)
    if (!billingRecord?.stripeCustomerId) {
      return getStatus(userId)
    }

    return (await syncStripeDataForCustomer(billingRecord.stripeCustomerId)) ?? getStatus(userId)
  }

  const processWebhook = async (payload: string, signature: string) => {
    if (!billingEnabled) {
      throw new BillingConfigurationError('Billing is not available yet')
    }

    const stripe = getStripeClient()
    const event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret())
    if (!BILLING_SYNC_EVENTS.has(event.type)) {
      return
    }

    const customerId = readCustomerId(event.data.object)
    if (!customerId) {
      console.warn('[billing] skipped Stripe event without a customer ID', event.type)
      return
    }

    await syncStripeDataForCustomer(customerId)
  }

  const getPlans = async () => {
    if (!billingEnabled) return []

    if (!planPricesPromise) {
      planPricesPromise = Promise.all(PAID_BILLING_PLANS.map(async (plan) => {
        const price = await getStripeClient().prices.retrieve(getPriceId(plan))
        if (price.unit_amount === null) {
          throw new BillingConfigurationError(`Stripe price for ${plan} must have a fixed unit amount`)
        }

        return {
          plan,
          unitAmount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval ?? null
        }
      })).catch((error) => {
        planPricesPromise = null
        throw error
      })
    }

    return planPricesPromise
  }

  return {
    createCheckoutSession,
    createPortalSession,
    getStatus,
    getPlans,
    getEntitlements,
    syncUser,
    processWebhook
  }
}

export const selectSubscription = (
  subscriptions: Stripe.Subscription[],
  storedSubscriptionId: string | null,
  readPlan: (subscription: Stripe.Subscription) => BillingPlan | null
) => {
  const stored = storedSubscriptionId
    ? subscriptions.find((subscription) => subscription.id === storedSubscriptionId)
    : undefined
  if (stored && ACTIVE_BILLING_STATUSES.has(stored.status)) return stored

  const selected = [...subscriptions].sort((left, right) => {
    const leftActivePaid = ACTIVE_BILLING_STATUSES.has(left.status) && readPlan(left) !== null
    const rightActivePaid = ACTIVE_BILLING_STATUSES.has(right.status) && readPlan(right) !== null
    if (leftActivePaid !== rightActivePaid) return leftActivePaid ? -1 : 1

    const leftActive = ACTIVE_BILLING_STATUSES.has(left.status)
    const rightActive = ACTIVE_BILLING_STATUSES.has(right.status)
    if (leftActive !== rightActive) return leftActive ? -1 : 1

    return right.created - left.created
  })[0]

  if (selected && ACTIVE_BILLING_STATUSES.has(selected.status)) return selected
  return stored ?? selected
}

export const isPaidBillingPlan = (value: unknown): value is PaidBillingPlan => {
  return typeof value === 'string' && PAID_BILLING_PLANS.includes(value as PaidBillingPlan)
}

const readCustomerId = (object: unknown) => {
  if (!object || typeof object !== 'object' || !('customer' in object)) {
    return null
  }

  const customer = object.customer
  if (typeof customer === 'string') {
    return customer
  }

  if (customer && typeof customer === 'object' && 'id' in customer && typeof customer.id === 'string') {
    return customer.id
  }

  return null
}
