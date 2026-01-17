import { BillingValidationError } from './errors'
import { CreateCheckoutSessionInput, CreatePortalSessionInput } from './models'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const parseCreateCheckoutSessionInput = (payload: unknown): CreateCheckoutSessionInput => {
  if (!isRecord(payload)) {
    throw new BillingValidationError('Body must be a JSON object')
  }

  const priceId = payload.price_id ?? payload.priceId
  if (typeof priceId !== 'string' || priceId.trim().length === 0) {
    throw new BillingValidationError('price_id must be a non-empty string')
  }

  return { priceId: priceId.trim() }
}

export const parseCreatePortalSessionInput = (payload: unknown): CreatePortalSessionInput => {
  if (!isRecord(payload)) {
    throw new BillingValidationError('Body must be a JSON object')
  }

  const returnUrl = payload.return_url ?? payload.returnUrl
  if (typeof returnUrl !== 'string' || returnUrl.trim().length === 0) {
    throw new BillingValidationError('return_url must be a non-empty string')
  }

  try {
    new URL(returnUrl)
  } catch {
    throw new BillingValidationError('return_url must be a valid URL')
  }

  return { returnUrl: returnUrl.trim() }
}

