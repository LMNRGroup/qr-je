import { describe, expect, test } from 'bun:test'
import type Stripe from 'stripe'

import { createUsersService } from '../users/service'
import { InMemoryUsersStorageAdapter } from '../users/storage/memory.adapter'
import { createBillingService, selectSubscription } from './service'
import { InMemoryBillingStorageAdapter } from './storage/memory.adapter'

const subscription = (
  id: string,
  priceId: string,
  status: Stripe.Subscription.Status = 'active',
  created = 1,
  metadataPlan = 'pro'
) => ({
  id,
  status,
  created,
  metadata: { plan: metadataPlan },
  items: { data: [{ price: { id: priceId } }] }
}) as unknown as Stripe.Subscription

const setup = async (subscriptions: Stripe.Subscription[]) => {
  process.env.STRIPE_PRO_PRICE_ID = 'price_pro'
  process.env.STRIPE_COMMAND_PRICE_ID = 'price_command'

  const users = createUsersService(new InMemoryUsersStorageAdapter())
  await users.upsertUser({ id: 'user-1', name: 'Test User', email: 'test@example.com' })
  const storage = new InMemoryBillingStorageAdapter()
  await storage.upsert({
    userId: 'user-1',
    stripeCustomerId: 'cus_1',
    stripeSubscriptionId: subscriptions[0]?.id ?? null,
    billingPlan: 'pro',
    billingStatus: 'active',
    billingPriceId: 'price_pro'
  })
  const stripe = {
    subscriptions: {
      list: async () => ({ data: subscriptions })
    }
  } as unknown as Stripe

  return {
    service: createBillingService(users, storage, { stripe, enabled: true }),
    storage
  }
}

describe('billing synchronization', () => {
  test('the Stripe price overrides stale subscription metadata after a portal plan change', async () => {
    const { service } = await setup([subscription('sub_1', 'price_command', 'active', 10, 'pro')])

    const status = await service.syncUser('user-1')

    expect(status.plan).toBe('command')
    expect(status.priceId).toBe('price_command')
  })

  test('an unknown active price fails closed to the free plan', async () => {
    const { service } = await setup([subscription('sub_1', 'price_unknown')])

    const status = await service.syncUser('user-1')

    expect(status.plan).toBe('free')
  })

  test('a missing subscription clears the stored paid entitlement', async () => {
    const { service, storage } = await setup([])
    await storage.upsert({
      userId: 'user-1',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_old',
      billingPlan: 'pro',
      billingStatus: 'active',
      billingPriceId: 'price_pro'
    })

    const status = await service.syncUser('user-1')

    expect(status.plan).toBe('free')
    expect(status.subscriptionStatus).toBeNull()
  })

  test('selection prefers an active stored subscription and does not get stuck on a canceled one', () => {
    const activeStored = subscription('sub_stored', 'price_pro', 'active', 1)
    const oldStored = subscription('sub_old', 'price_pro', 'canceled', 1)
    const newestActive = subscription('sub_active', 'price_command', 'active', 10)
    const readPlan = (candidate: Stripe.Subscription) =>
      candidate.items.data[0]?.price.id === 'price_command' ? 'command' as const : null

    expect(selectSubscription([newestActive, activeStored], 'sub_stored', readPlan)?.id).toBe('sub_stored')
    expect(selectSubscription([newestActive, oldStored], 'sub_old', readPlan)?.id).toBe('sub_active')
    expect(selectSubscription([oldStored, newestActive], null, readPlan)?.id).toBe('sub_active')
  })
})
