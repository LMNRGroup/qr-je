const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO ?? ''
const STRIPE_PRICE_PREMIUM = process.env.STRIPE_PRICE_PREMIUM ?? ''
const STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL ?? ''
const STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL ?? ''

export type StripeConfig = {
  secretKey: string
  webhookSecret: string
  successUrl: string
  cancelUrl: string
  priceMap: Record<string, string>
}

export const getStripeConfig = (): StripeConfig => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is required')
  }

  if (!STRIPE_SUCCESS_URL) {
    throw new Error('STRIPE_SUCCESS_URL is required')
  }

  if (!STRIPE_CANCEL_URL) {
    throw new Error('STRIPE_CANCEL_URL is required')
  }

  const priceMap: Record<string, string> = {}
  if (STRIPE_PRICE_PRO) {
    priceMap[STRIPE_PRICE_PRO] = 'pro'
  }
  if (STRIPE_PRICE_PREMIUM) {
    priceMap[STRIPE_PRICE_PREMIUM] = 'premium'
  }

  return {
    secretKey: STRIPE_SECRET_KEY,
    webhookSecret: STRIPE_WEBHOOK_SECRET,
    successUrl: STRIPE_SUCCESS_URL,
    cancelUrl: STRIPE_CANCEL_URL,
    priceMap
  }
}

export const getStripeWebhookSecret = () => {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required')
  }

  return STRIPE_WEBHOOK_SECRET
}
