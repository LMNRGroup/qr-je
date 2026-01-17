export class BillingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BillingValidationError'
  }
}

export class BillingStripeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BillingStripeError'
  }
}

